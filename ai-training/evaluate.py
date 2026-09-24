import os
import sys
import torch
import numpy as np
import pandas as pd
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix
)

MODEL_DIR = "./models/multilingual-abuse-model/"
TEST_DATA_PATH = "./dataset/cleaned_test_split.csv"

def evaluate_model():
    print("=== Multilingual Toxicity Model Evaluation ===")
    
    # 1. Check if model exists
    if not os.path.exists(MODEL_DIR):
        print(f"Error: Model directory not found at '{MODEL_DIR}'. Please run train.py first.", file=sys.stderr)
        sys.exit(1)
        
    if not os.path.exists(TEST_DATA_PATH):
        print(f"Error: Test data file not found at '{TEST_DATA_PATH}'. Please run train.py first.", file=sys.stderr)
        sys.exit(1)
        
    # 2. Load model and tokenizer
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading fine-tuned model and tokenizer from '{MODEL_DIR}' on '{device}'...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
        model.to(device)
        model.eval()
    except Exception as e:
        print(f"Error loading model/tokenizer: {e}", file=sys.stderr)
        sys.exit(1)
        
    # 3. Load test data
    print(f"Loading test dataset from '{TEST_DATA_PATH}'...")
    df = pd.read_csv(TEST_DATA_PATH)
    
    # Verify columns
    if 'text' not in df.columns or 'label' not in df.columns or 'lang' not in df.columns:
        print(f"Error: Expected columns 'text', 'label', 'lang' in test data. Found: {list(df.columns)}", file=sys.stderr)
        sys.exit(1)
        
    print(f"Loaded {len(df)} test records.")
    
    # Identify included languages
    languages_present = sorted(df['lang'].unique().tolist())
    print(f"Languages present in test set: {languages_present}\n")
    
    # 4. Perform inference
    texts = df['text'].tolist()
    labels = df['label'].tolist()
    langs = df['lang'].tolist()
    
    batch_size = 16
    preds = []
    
    print("Running evaluation inference...")
    with torch.no_grad():
        for i in range(0, len(texts), batch_size):
            batch_texts = [str(t) for t in texts[i:i+batch_size]]
            inputs = tokenizer(
                batch_texts,
                padding=True,
                truncation=True,
                max_length=128,
                return_tensors="pt"
            )
            inputs = {k: v.to(device) for k, v in inputs.items()}
            outputs = model(**inputs)
            batch_preds = torch.argmax(outputs.logits, dim=1).cpu().numpy().tolist()
            preds.extend(batch_preds)
            
    df['prediction'] = preds
    
    # 5. Compute metrics
    # Overall metrics
    overall_acc = accuracy_score(labels, preds)
    overall_prec, overall_rec, overall_f1, _ = precision_recall_fscore_support(
        labels, preds, average='binary', zero_division=0
    )
    overall_cm = confusion_matrix(labels, preds)
    tn, fp, fn, tp = overall_cm.ravel() if overall_cm.size == 4 else (0, 0, 0, 0)
    
    print("\n" + "=" * 45)
    print("                OVERALL RESULTS")
    print("=" * 45)
    print(f"Accuracy:  {overall_acc:.4f}")
    print(f"Precision: {overall_prec:.4f}")
    print(f"Recall:    {overall_rec:.4f}")
    print(f"F1-score:  {overall_f1:.4f}")
    print("\nConfusion Matrix:")
    print(f"  True Negatives (Non-Toxic Correct):  {tn}")
    print(f"  False Positives (Non-Toxic -> Toxic): {fp}")
    print(f"  False Negatives (Toxic -> Non-Toxic): {fn}")
    print(f"  True Positives (Toxic Correct):      {tp}")
    print("=" * 45 + "\n")
    
    # Per-language metrics
    print("=" * 70)
    print("                     PER-LANGUAGE METRICS")
    print("=" * 70)
    print(f"{'Language':<10} | {'Count':<8} | {'Accuracy':<10} | {'Precision':<10} | {'Recall':<10} | {'F1-score':<10}")
    print("-" * 70)
    
    for lang in languages_present:
        lang_df = df[df['lang'] == lang]
        lang_labels = lang_df['label'].tolist()
        lang_preds = lang_df['prediction'].tolist()
        
        acc = accuracy_score(lang_labels, lang_preds)
        prec, rec, f1, _ = precision_recall_fscore_support(
            lang_labels, lang_preds, average='binary', zero_division=0
        )
        print(f"{lang:<10} | {len(lang_df):<8} | {acc:<10.4f} | {prec:<10.4f} | {rec:<10.4f} | {f1:<10.4f}")
        
    print("=" * 70)
    print("\nLanguages supported / evaluated in this run:")
    for lang in languages_present:
        print(f"- {lang}")

if __name__ == "__main__":
    evaluate_model()
