import os
import base64
import torch
import uvicorn
import threading
import numpy as np
from typing import List, Optional, Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    AutoModelForImageClassification
)

app = FastAPI(title="SafeConnect Multi-Modal Abuse Detection Service")

# -----------------------------------------------------------------------------
# 0. SERVICE LIFECYCLE & STATE MACHINE (Part 9 - State Tracking)
# -----------------------------------------------------------------------------
SERVICE_STATE = {
    "status": "STARTING",
    "models": {
        "text": False,
        "vision": False,
        "synthetic": False
    },
    "message": "Service starting...",
    "device": "cuda" if torch.cuda.is_available() else "cpu"
}

MAX_CONCURRENCY = int(os.getenv("MAX_IMAGE_MODERATION_CONCURRENCY", "2"))
moderation_semaphore = threading.Semaphore(MAX_CONCURRENCY)

# -----------------------------------------------------------------------------
# 1. TEXT ABUSE DETECTION MODEL (Preserved from existing setup)
# -----------------------------------------------------------------------------
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
possible_paths = [
    os.path.abspath(os.path.join(CURRENT_DIR, "..", "ai-training", "models", "multilingual-abuse-model")),
    os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "ai-training", "models", "multilingual-abuse-model")),
    os.path.abspath(os.path.join(CURRENT_DIR, "ai-training", "models", "multilingual-abuse-model"))
]
MODEL_PATH = next((p for p in possible_paths if os.path.exists(p)), possible_paths[0])

class PredictRequest(BaseModel):
    message: str

class PredictResponse(BaseModel):
    safe: bool
    label: str
    confidence: float
    severity: str

print(f"Loading custom fine-tuned text model from '{MODEL_PATH}'...")
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    text_model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    text_device = SERVICE_STATE["device"]
    text_model.to(text_device)
    text_model.eval()
    SERVICE_STATE["models"]["text"] = True
    print(f"Text model loaded successfully on {text_device}.")
except Exception as e:
    print(f"Error loading text model: {e}")
    tokenizer = None
    text_model = None
    SERVICE_STATE["models"]["text"] = False

# -----------------------------------------------------------------------------
# 2. VISION SAFETY MODEL CONFIGURATION & LOADING (Part 3)
# -----------------------------------------------------------------------------
VISION_SAFETY_CONFIG = {
    "model_name": "Falconsai/nsfw_image_detection",
    "thresholds": {
        "nsfw": 0.60,
        "default": 0.60
    },
    "input_size": 224,
    "channel_order": "RGB"
}

VISION_MODEL_NAME = VISION_SAFETY_CONFIG["model_name"]
print(f"Loading visual safety model '{VISION_MODEL_NAME}'...")
try:
    vision_model = AutoModelForImageClassification.from_pretrained(VISION_MODEL_NAME)
    vision_device = SERVICE_STATE["device"]
    vision_model.to(vision_device)
    vision_model.eval()
    SERVICE_STATE["models"]["vision"] = True
    print(f"Vision safety model loaded successfully on {vision_device} with labels: {vision_model.config.id2label}")
except Exception as e:
    print(f"Error loading vision safety model: {e}")
    vision_model = None
    SERVICE_STATE["models"]["vision"] = False

# -----------------------------------------------------------------------------
# 2.5 SYNTHETIC / MANIPULATED IMAGE DETECTOR (Part 5)
# -----------------------------------------------------------------------------
SYNTHETIC_DETECTOR_CONFIG = {
    "model_name": "umm-maybe/AI-image-detector",
    "threshold": 0.70,
    "input_size": 224,
    "channel_order": "RGB"
}

SYNTHETIC_MODEL_NAME = SYNTHETIC_DETECTOR_CONFIG["model_name"]
print(f"Loading synthetic / manipulated image detector '{SYNTHETIC_MODEL_NAME}'...")
try:
    synthetic_model = AutoModelForImageClassification.from_pretrained(SYNTHETIC_MODEL_NAME)
    synthetic_device = SERVICE_STATE["device"]
    synthetic_model.to(synthetic_device)
    synthetic_model.eval()
    SERVICE_STATE["models"]["synthetic"] = True
    print(f"Synthetic image detector loaded successfully on {synthetic_device} with labels: {synthetic_model.config.id2label}")
except Exception as e:
    print(f"Error loading synthetic image detector: {e}")
    synthetic_model = None
    SERVICE_STATE["models"]["synthetic"] = False

if SERVICE_STATE["models"]["vision"]:
    SERVICE_STATE["status"] = "READY"
    SERVICE_STATE["message"] = "Vision and language safety models loaded and ready."
else:
    SERVICE_STATE["status"] = "ERROR"
    SERVICE_STATE["message"] = "Critical vision safety model failed to initialize."

print(f"[SERVICE STATE] SafeConnect AI Service status: {SERVICE_STATE['status']} (Concurrency limit: {MAX_CONCURRENCY})")

# -----------------------------------------------------------------------------
# 3. PYDANTIC SCHEMAS FOR IMAGE MODERATION
# -----------------------------------------------------------------------------
class ImageModerateRequest(BaseModel):
    tensor_base64: Optional[str] = None
    shape: Optional[List[int]] = [1, 3, 224, 224]
    image: Optional[str] = None

class SyntheticDetails(BaseModel):
    isSynthetic: bool
    isManipulated: bool
    confidence: float
    status: str
    scores: Optional[Dict[str, float]] = None

class ImageModerateResponse(BaseModel):
    isAbusive: bool
    status: str
    categories: List[str]
    confidence: float
    details: Optional[Dict[str, float]] = None
    synthetic: Optional[SyntheticDetails] = None

# -----------------------------------------------------------------------------
# 4. API ROUTES & HEALTH CHECK
# -----------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "status": SERVICE_STATE["status"],
        "service": "SafeConnect Multi-Modal Abuse Detection",
        "ready": SERVICE_STATE["status"] == "READY",
        "models": SERVICE_STATE["models"],
        "concurrency_limit": MAX_CONCURRENCY
    }

@app.get("/health")
def health_check():
    is_ready = SERVICE_STATE["status"] == "READY"
    return {
        "status": SERVICE_STATE["status"],
        "ready": is_ready,
        "models": SERVICE_STATE["models"],
        "message": SERVICE_STATE["message"],
        "concurrency_limit": MAX_CONCURRENCY,
        "device": SERVICE_STATE["device"]
    }

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    if text_model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Text model is not loaded or temporarily unavailable.")
    
    text = request.message.strip()
    if not text:
        return PredictResponse(
            safe=True,
            label="non-toxic",
            confidence=1.0,
            severity="None"
        )
    
    try:
        inputs = tokenizer(
            text,
            padding=True,
            truncation=True,
            max_length=128,
            return_tensors="pt"
        )
        device = next(text_model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = text_model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1).cpu().numpy()[0]
            toxic_score = float(probs[1])
            
        is_safe = toxic_score < 0.47
        
        if not is_safe:
            confidence = 0.80 + (toxic_score - 0.47) * 2.0
            confidence = float(round(min(max(confidence, 0.80), 0.98), 4))
            
            if confidence > 0.85:
                severity = "High"
            elif confidence > 0.65:
                severity = "Medium"
            else:
                severity = "Low"
                
            return PredictResponse(
                safe=False,
                label="toxic",
                confidence=confidence,
                severity=severity
            )
        else:
            safe_confidence = 1.0 - (toxic_score / 0.47) * 0.5
            safe_confidence = float(round(min(max(safe_confidence, 0.50), 1.0), 4))
            return PredictResponse(
                safe=True,
                label="non-toxic",
                confidence=safe_confidence,
                severity="None"
            )
            
    except Exception as e:
        print(f"[TEXT PREDICT ERROR] {e}")
        raise HTTPException(status_code=500, detail="Text prediction processing error.")

@app.post("/moderate-image", response_model=ImageModerateResponse)
def moderate_image(request: ImageModerateRequest):
    """
    Evaluates an image for harmful visual content using the loaded Computer Vision safety model.
    Reuses the pre-loaded model instances and shares the preprocessed Float32 tensor.
    Guarded by concurrency semaphore and model initialization state check.
    """
    if SERVICE_STATE["status"] != "READY" or vision_model is None:
        raise HTTPException(
            status_code=503,
            detail="Vision safety AI model is not ready or temporarily unavailable."
        )

    # Concurrency control (Part 9 - Semaphore Guard)
    acquired = moderation_semaphore.acquire(blocking=True, timeout=12.0)
    if not acquired:
        raise HTTPException(
            status_code=503,
            detail="AI image moderation service is busy with maximum concurrent tasks. Please try again."
        )

    try:
        pixel_values = None

        # 1. Primary path: Use Part 2 preprocessed Float32Array tensor
        if request.tensor_base64:
            decoded_bytes = base64.b64decode(request.tensor_base64)
            shape = tuple(request.shape) if request.shape else (1, 3, 224, 224)
            raw_np = np.frombuffer(decoded_bytes, dtype=np.float32).copy().reshape(shape)
            pixel_values = torch.from_numpy(raw_np)
        elif request.image:
            # Fallback path if raw image string is sent directly
            clean_b64 = request.image.split(",")[-1]
            raw_bytes = base64.b64decode(clean_b64)
            import cv2
            img_np = cv2.imdecode(np.frombuffer(raw_bytes, np.uint8), cv2.IMREAD_COLOR)
            if img_np is None:
                raise ValueError("Could not decode image.")
            img_rgb = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)
            img_resized = cv2.resize(img_rgb, (224, 224)).astype(np.float32) / 255.0
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            norm = (img_resized - mean) / std
            arr = np.transpose(norm, (2, 0, 1))[np.newaxis, ...]
            pixel_values = torch.from_numpy(arr)
        else:
            raise HTTPException(status_code=400, detail="Missing tensor or image payload.")

        # Ensure correct tensor device and compute model probabilities
        device = next(vision_model.parameters()).device
        pixel_values = pixel_values.to(device)

        with torch.no_grad():
            outputs = vision_model(pixel_values=pixel_values)
            probs = torch.softmax(outputs.logits, dim=-1)[0].cpu().numpy()

        id2label = vision_model.config.id2label
        category_scores = {id2label[i]: float(probs[i]) for i in range(len(probs))}

        # Evaluate against configured visual safety thresholds
        thresholds = VISION_SAFETY_CONFIG.get("thresholds", {})
        default_thresh = thresholds.get("default", 0.60)

        SAFE_LABELS = {"normal", "safe", "sfw", "neutral", "drawings", "drawing"}
        HARMFUL_LABELS = {
            "nsfw", "porn", "sexy", "hentai", "explicit", "nudity", "sexual",
            "violence", "blood", "gore", "harmful", "unsafe"
        }

        detected_categories = []
        max_abusive_conf = 0.0

        for label, score in category_scores.items():
            norm_label = label.lower()
            # Skip benign / safe class labels
            if norm_label in SAFE_LABELS:
                continue

            thresh = thresholds.get(norm_label, default_thresh)
            if (norm_label in HARMFUL_LABELS or norm_label not in SAFE_LABELS) and score >= thresh:
                detected_categories.append(norm_label)
                if score > max_abusive_conf:
                    max_abusive_conf = score

        is_abusive = len(detected_categories) > 0
        status = "ABUSIVE" if is_abusive else "SAFE"
        if is_abusive:
            confidence = float(round(max_abusive_conf, 4))
        else:
            safe_conf = category_scores.get("normal", category_scores.get("safe", 1.0 - max_abusive_conf))
            confidence = float(round(safe_conf, 4))

        # Part 5: Synthetic / AI-Generated / Manipulated Image Inference (Reusing pixel_values)
        synthetic_payload = None
        if synthetic_model is not None and SERVICE_STATE["models"]["synthetic"]:
            try:
                syn_device = next(synthetic_model.parameters()).device
                syn_pixel_values = pixel_values.to(syn_device)
                with torch.no_grad():
                    syn_outputs = synthetic_model(pixel_values=syn_pixel_values)
                    syn_probs = torch.softmax(syn_outputs.logits, dim=-1)[0].cpu().numpy()

                syn_id2label = synthetic_model.config.id2label
                syn_scores = {syn_id2label[i]: float(syn_probs[i]) for i in range(len(syn_probs))}
                artificial_prob = syn_scores.get("artificial", float(syn_probs[0]))
                human_prob = syn_scores.get("human", float(syn_probs[1]))
                syn_thresh = SYNTHETIC_DETECTOR_CONFIG.get("threshold", 0.70)
                is_synthetic = bool(artificial_prob >= syn_thresh)
                syn_conf = artificial_prob if is_synthetic else human_prob

                synthetic_payload = SyntheticDetails(
                    isSynthetic=is_synthetic,
                    isManipulated=is_synthetic,
                    confidence=float(round(syn_conf, 4)),
                    status="SYNTHETIC_OR_MANIPULATED" if is_synthetic else "NO_SIGNIFICANT_SYNTHETIC_SIGNAL",
                    scores={
                        "artificial": float(round(artificial_prob, 4)),
                        "human": float(round(human_prob, 4))
                    }
                )
            except Exception as syn_err:
                print(f"[SYNTHETIC DETECTOR WARNING] Inference error: {syn_err}")
                synthetic_payload = SyntheticDetails(
                    isSynthetic=False,
                    isManipulated=False,
                    confidence=0.0,
                    status="DETECTOR_INFERENCE_ERROR",
                    scores={}
                )
        else:
            synthetic_payload = SyntheticDetails(
                isSynthetic=False,
                isManipulated=False,
                confidence=0.0,
                status="DETECTOR_NOT_AVAILABLE",
                scores={}
            )

        return ImageModerateResponse(
            isAbusive=is_abusive,
            status=status,
            categories=detected_categories,
            confidence=confidence,
            details=category_scores,
            synthetic=synthetic_payload
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[VISION SERVICE ERROR] {e}")
        raise HTTPException(status_code=500, detail="Vision safety processing failed.")
    finally:
        moderation_semaphore.release()

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)
