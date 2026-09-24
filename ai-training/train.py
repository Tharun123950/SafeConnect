import os
import sys
import torch
import numpy as np
import pandas as pd
from datasets import load_dataset, concatenate_datasets, DatasetDict
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
    DataCollatorWithPadding
)
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

MODEL_NAME = "xlm-roberta-base"
DATASET_NAME = "textdetox/multilingual_toxicity_dataset"
OUTPUT_DIR = "./models/multilingual-abuse-model/"

def clean_and_split_dataset(downsample=True):
    """
    Loads textdetox/multilingual_toxicity_dataset, cleans empty/invalid records,
    and splits each language's data into Train (80%), Val (10%), and Test (10%).
    
    If downsample=True, takes a small representative subset per language to
    ensure the training loop completes quickly on CPU.
    """
    print("\n--- Phase 1: Loading and Cleaning Dataset ---")
    raw_dataset = load_dataset(DATASET_NAME)
    languages = list(raw_dataset.keys())
    print(f"Languages present in dataset: {languages}")
    
    train_splits = []
    val_splits = []
    test_splits = []
    
    # Store stats for logging
    raw_counts = {}
    clean_counts = {}
    
    for lang in languages:
        lang_data = raw_dataset[lang]
        raw_counts[lang] = len(lang_data)
        
        # Clean: remove empty/invalid text and labels that are not 0 or 1
        df = lang_data.to_pandas()
        
        # Cast labels to int
        df['toxic'] = pd.to_numeric(df['toxic'], errors='coerce')
        # Drop row if text is null/NaN, empty string, or not string, or label is null/NaN or not 0 or 1
        df = df[
            df['text'].notna() & 
            df['text'].apply(lambda x: isinstance(x, str) and len(str(x).strip()) > 0) & 
            df['toxic'].isin([0, 1])
        ]
        
        # Convert label back to int
        df['toxic'] = df['toxic'].astype(int)
        # Add lang indicator column
        df['lang'] = lang
        
        clean_counts[lang] = len(df)
        
        # Re-convert to HF dataset
        from datasets import Dataset
        clean_lang_dataset = Dataset.from_pandas(df, preserve_index=False)
        
        # Split: Train/Val/Test (80/10/10)
        # First split into 80% train and 20% temp
        train_temp = clean_lang_dataset.train_test_split(test_size=0.2, seed=42)
        train_part = train_temp['train']
        
        # Then split the 20% temp into 50% val and 50% test (10% and 10% of total)
        val_test_part = train_temp['test'].train_test_split(test_size=0.5, seed=42)
        val_part = val_test_part['train']
        # The remaining is test
        test_part = val_test_part['test']
        
        if downsample:
            # Take a small representative subset per language for CPU training
            # e.g., 50 train, 10 val, 10 test samples per language
            train_part = train_part.select(range(min(len(train_part), 50)))
            val_part = val_part.select(range(min(len(val_part), 10)))
            test_part = test_part.select(range(min(len(test_part), 10)))
            
        train_splits.append(train_part)
        val_splits.append(val_part)
        test_splits.append(test_part)
        
    # Concatenate all splits
    train_dataset = concatenate_datasets(train_splits)
    val_dataset = concatenate_datasets(val_splits)
    test_dataset = concatenate_datasets(test_splits)
    
    # Print dataset cleaning stats
    print("\nData Cleaning Report:")
    print(f"{'Language':<10} | {'Raw Count':<10} | {'Clean Count':<12} | {'Train Split':<12} | {'Val Split':<10} | {'Test Split':<10}")
    print("-" * 75)
    for i, lang in enumerate(languages):
        print(f"{lang:<10} | {raw_counts[lang]:<10} | {clean_counts[lang]:<12} | {len(train_splits[i]):<12} | {len(val_splits[i]):<10} | {len(test_splits[i]):<10}")
    print("-" * 75)
    print(f"{'TOTAL':<10} | {sum(raw_counts.values()):<10} | {sum(clean_counts.values()):<12} | {len(train_dataset):<12} | {len(val_dataset):<10} | {len(test_dataset):<10}\n")
    
    return DatasetDict({
        'train': train_dataset,
        'validation': val_dataset,
        'test': test_dataset
    })

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    preds = np.argmax(predictions, axis=1)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average='binary')
    acc = accuracy_score(labels, preds)
    return {
        'accuracy': acc,
        'f1': f1,
        'precision': precision,
        'recall': recall
    }

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device selected for training: {device}")
    
    # 1. Load and clean
    # Downsample by default if on CPU to make execution fast
    downsample = (device == "cpu")
    
    # Check override from args
    if "--full" in sys.argv:
        downsample = False
    elif "--downsample" in sys.argv:
        downsample = True
        
    dataset = clean_and_split_dataset(downsample=downsample)
    
    # 2. Load tokenizer
    print("\n--- Phase 2: Tokenization ---")
    print(f"Loading XLM-R Tokenizer from '{MODEL_NAME}'...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    
    # Rename 'toxic' column to 'labels' as required by HF Trainer
    dataset = dataset.rename_column("toxic", "label")
    
    def tokenize_function(examples):
        return tokenizer(examples['text'], truncation=True, max_length=128)
        
    print("Tokenizing datasets...")
    tokenized_dataset = dataset.map(tokenize_function, batched=True)
    
    # 3. Load Model
    print("\n--- Phase 3: Loading Pre-trained Model ---")
    print(f"Loading model '{MODEL_NAME}' for binary classification...")
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=2)
    
    # 4. Training Arguments
    # Adjust learning rates & epochs for demo cpu run
    epochs = 1 if downsample else 3
    batch_size = 8 if downsample else 16
    
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        learning_rate=2e-5,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        num_train_epochs=epochs,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        logging_steps=10 if downsample else 50,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        report_to="none",
        use_cpu=(device == "cpu")
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset['train'],
        eval_dataset=tokenized_dataset['validation'],
        processing_class=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
        compute_metrics=compute_metrics
    )
    
    # 5. Run fine-tuning
    print("\n--- Phase 4: Running Fine-Tuning ---")
    print(f"Training parameters: epochs={epochs}, batch_size={batch_size}, downsample={downsample}")
    trainer.train()
    
    # 6. Save model
    print("\n--- Phase 5: Saving Trained Model ---")
    print(f"Saving fine-tuned model to: {OUTPUT_DIR}")
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    
    # Save the test set as CSV so evaluate.py can load it
    print("Saving test split to text files for evaluation...")
    test_df = dataset['test'].to_pandas()
    os.makedirs("./dataset", exist_ok=True)
    test_df.to_csv("./dataset/cleaned_test_split.csv", index=False, encoding='utf-8')
    print("Staged test dataset saved successfully.")

if __name__ == "__main__":
    main()
