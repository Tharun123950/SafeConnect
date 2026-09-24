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

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OLD_MODEL_DIR = os.path.join(SCRIPT_DIR, "models", "multilingual-abuse-model")
NEW_MODEL_DIR = os.path.join(SCRIPT_DIR, "models", "improved-model-v2")
TEST_DATA_PATH = os.path.join(SCRIPT_DIR, "dataset", "combined_abuse_dataset_v2", "test.csv")

def evaluate_subset(model, tokenizer, device, texts, labels):
    if len(texts) == 0:
        return {
            'accuracy': 0.0,
            'precision': 0.0,
            'recall': 0.0,
            'f1': 0.0,
            'tn': 0, 'fp': 0, 'fn': 0, 'tp': 0
        }
        
    batch_size = 16
    preds = []
    
    with torch.no_grad():
        for i in range(0, len(texts), batch_size):
            batch_texts = [str(t) for t in texts[i:i+batch_size]]
            inputs = tokenizer(
                batch_texts,
                padding=True,
                truncation=True,
                max_length=64,
                return_tensors="pt"
            )
            inputs = {k: v.to(device) for k, v in inputs.items()}
            outputs = model(**inputs)
            batch_preds = torch.argmax(outputs.logits, dim=1).cpu().numpy().tolist()
            preds.extend(batch_preds)
            
    acc = accuracy_score(labels, preds)
    prec, rec, f1, _ = precision_recall_fscore_support(
        labels, preds, average='binary', zero_division=0
    )
    cm = confusion_matrix(labels, preds)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    if cm.size == 1:
        # If all samples belong to one class in small subset
        if labels[0] == 1:
            tp = cm[0][0] if preds[0] == 1 else 0
            fn = cm[0][0] if preds[0] == 0 else 0
        else:
            tn = cm[0][0] if preds[0] == 0 else 0
            fp = cm[0][0] if preds[0] == 1 else 0
            
    return {
        'accuracy': acc,
        'precision': prec,
        'recall': rec,
        'f1': f1,
        'tn': tn,
        'fp': fp,
        'fn': fn,
        'tp': tp
    }

def print_result_block(name, old_res, new_res):
    print(f"\n==========================================")
    print(f"       SUBSET: {name}")
    print(f"==========================================")
    print(f"Metric        | Old Model   | New Model")
    print(f"--------------|-------------|-------------")
    print(f"Accuracy      | {old_res['accuracy']:.4f}      | {new_res['accuracy']:.4f}")
    print(f"Precision     | {old_res['precision']:.4f}      | {new_res['precision']:.4f}")
    print(f"Recall        | {old_res['recall']:.4f}      | {new_res['recall']:.4f}")
    print(f"F1-score      | {old_res['f1']:.4f}      | {new_res['f1']:.4f}")
    print(f"\nOld Confusion Matrix:")
    print(f"  True Negatives (Safe Correct):       {old_res['tn']}")
    print(f"  False Positives (Safe -> Toxic):     {old_res['fp']}")
    print(f"  False Negatives (Toxic -> Safe):     {old_res['fn']}")
    print(f"  True Positives (Toxic Correct):      {old_res['tp']}")
    print(f"\nNew Confusion Matrix:")
    print(f"  True Negatives (Safe Correct):       {new_res['tn']}")
    print(f"  False Positives (Safe -> Toxic):     {new_res['fp']}")
    print(f"  False Negatives (Toxic -> Safe):     {new_res['fn']}")
    print(f"  True Positives (Toxic Correct):      {new_res['tp']}")

def perform_custom_tests(model, tokenizer, device, name):
    test_cases = [
        # English toxic/safe
        ("idiot", 1),
        ("IDIOT!!!", 1),
        ("i.d.i.o.t", 1),
        ("you are a stupid person", 1),
        ("hello how are you", 0),
        ("this is a beautiful day", 0),
        
        # Telugu toxic/safe
        ("dengutha", 1),
        ("DENGUTHA!!!", 1),
        ("d e n g u t h a", 1),
        ("d.e.n.g.u.t.h.a", 1),
        ("puku", 1),
        ("p u k u", 1),
        ("kutha", 1),
        ("niemma", 1),
        
        # Safe Telugu / Romanized Telugu
        ("namaskaram andi", 0),
        ("bagunnara", 0),
        ("tintunnara", 0),
        ("enti sangathulu", 0)
    ]
    
    print(f"\n==========================================")
    print(f"  STANDALONE TEST CASES FOR: {name}")
    print(f"==========================================")
    print(f"{'Input Message':<30} | {'Expected':<10} | {'Predicted':<10} | {'Status':<10}")
    print(f"----------------------------------------------------------------------")
    
    for text, expected in test_cases:
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=64).to(device)
        with torch.no_grad():
            outputs = model(**inputs)
            pred = torch.argmax(outputs.logits, dim=1).cpu().item()
        
        status = "PASSED" if pred == expected else "FAILED"
        exp_str = "TOXIC" if expected == 1 else "SAFE"
        pred_str = "TOXIC" if pred == 1 else "SAFE"
        print(f"{text:<30} | {exp_str:<10} | {pred_str:<10} | {status:<10}")

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device selected for evaluation: {device}")
    
    # Check paths
    if not os.path.exists(OLD_MODEL_DIR):
        print(f"ERROR: Old model path not found at: {OLD_MODEL_DIR}", file=sys.stderr)
        sys.exit(1)
        
    if not os.path.exists(NEW_MODEL_DIR):
        print(f"ERROR: New model path not found at: {NEW_MODEL_DIR}. Please train it first.", file=sys.stderr)
        sys.exit(1)
        
    if not os.path.exists(TEST_DATA_PATH):
        print(f"ERROR: Combined test dataset not found at: {TEST_DATA_PATH}. Please run train_v2.py first.", file=sys.stderr)
        sys.exit(1)
        
    # Load test dataset
    df = pd.read_csv(TEST_DATA_PATH)
    print(f"Loaded {len(df)} records from test set.")
    
    # 1. Load tokenizer and models
    print("\nLoading models and tokenizers...")
    old_tokenizer = AutoTokenizer.from_pretrained(OLD_MODEL_DIR)
    old_model = AutoModelForSequenceClassification.from_pretrained(OLD_MODEL_DIR)
    old_model.to(device)
    old_model.eval()
    
    new_tokenizer = AutoTokenizer.from_pretrained(NEW_MODEL_DIR)
    new_model = AutoModelForSequenceClassification.from_pretrained(NEW_MODEL_DIR)
    new_model.to(device)
    new_model.eval()
    
    # Subsets
    # English: 'en'
    en_df = df[df['lang'] == 'en']
    # Telugu: 'te-rom'
    te_df = df[df['lang'] == 'te-rom']
    
    # Subsets info
    print(f"English test size: {len(en_df)}")
    print(f"Telugu Romanized test size: {len(te_df)}")
    print(f"Overall test size: {len(df)}")
    
    # Run evaluation
    print("\nEvaluating Old Model...")
    old_en_res = evaluate_subset(old_model, old_tokenizer, device, en_df['text'].tolist(), en_df['label'].tolist())
    old_te_res = evaluate_subset(old_model, old_tokenizer, device, te_df['text'].tolist(), te_df['label'].tolist())
    old_all_res = evaluate_subset(old_model, old_tokenizer, device, df['text'].tolist(), df['label'].tolist())
    
    print("\nEvaluating New Model V2...")
    new_en_res = evaluate_subset(new_model, new_tokenizer, device, en_df['text'].tolist(), en_df['label'].tolist())
    new_te_res = evaluate_subset(new_model, new_tokenizer, device, te_df['text'].tolist(), te_df['label'].tolist())
    new_all_res = evaluate_subset(new_model, new_tokenizer, device, df['text'].tolist(), df['label'].tolist())
    
    # Print results
    print_result_block("English", old_en_res, new_en_res)
    print_result_block("Telugu/Romanized Telugu", old_te_res, new_te_res)
    print_result_block("Overall Multilingual", old_all_res, new_all_res)
    
    # Final comparative table
    print("\n" + "=" * 55)
    print(f"{'Metric':<30} | {'Old Model':<10} | {'New Model':<10}")
    print("=" * 55)
    print(f"{'English Accuracy':<30} | {old_en_res['accuracy']:<10.4f} | {new_en_res['accuracy']:<10.4f}")
    print(f"{'English Precision':<30} | {old_en_res['precision']:<10.4f} | {new_en_res['precision']:<10.4f}")
    print(f"{'English Recall':<30} | {old_en_res['recall']:<10.4f} | {new_en_res['recall']:<10.4f}")
    print(f"{'English F1':<30} | {old_en_res['f1']:<10.4f} | {new_en_res['f1']:<10.4f}")
    print(f"---------------------------------+------------+------------")
    print(f"{'Telugu/Rom Telugu Accuracy':<30} | {old_te_res['accuracy']:<10.4f} | {new_te_res['accuracy']:<10.4f}")
    print(f"{'Telugu/Rom Telugu Precision':<30} | {old_te_res['precision']:<10.4f} | {new_te_res['precision']:<10.4f}")
    print(f"{'Telugu/Rom Telugu Recall':<30} | {old_te_res['recall']:<10.4f} | {new_te_res['recall']:<10.4f}")
    print(f"{'Telugu/Rom Telugu F1':<30} | {old_te_res['f1']:<10.4f} | {new_te_res['f1']:<10.4f}")
    print(f"---------------------------------+------------+------------")
    print(f"{'Overall Accuracy':<30} | {old_all_res['accuracy']:<10.4f} | {new_all_res['accuracy']:<10.4f}")
    print(f"{'Overall Precision':<30} | {old_all_res['precision']:<10.4f} | {new_all_res['precision']:<10.4f}")
    print(f"{'Overall Recall':<30} | {old_all_res['recall']:<10.4f} | {new_all_res['recall']:<10.4f}")
    print(f"{'Overall F1':<30} | {old_all_res['f1']:<10.4f} | {new_all_res['f1']:<10.4f}")
    print("=" * 55)
    
    # Standalone Tests
    perform_custom_tests(old_model, old_tokenizer, device, "OLD MODEL")
    perform_custom_tests(new_model, new_tokenizer, device, "NEW MODEL V2")

if __name__ == "__main__":
    main()
