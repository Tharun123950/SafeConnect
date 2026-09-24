import os
import sys
import torch
import numpy as np
import pandas as pd
from datasets import load_dataset, concatenate_datasets, Dataset, DatasetDict
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
    DataCollatorWithPadding
)
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

MODEL_NAME = "xlm-roberta-base"
ORIG_DATASET_NAME = "textdetox/multilingual_toxicity_dataset"

def clean_and_split_original_dataset(downsample=True):
    """
    Loads textdetox/multilingual_toxicity_dataset, cleans empty/invalid records,
    and splits each language's data into Train (80%), Val (10%), and Test (10%).
    Deterministic with seed=42.
    """
    print("\n--- Phase 1: Loading and Cleaning Original HF Dataset ---")
    raw_dataset = load_dataset(ORIG_DATASET_NAME)
    languages = list(raw_dataset.keys())
    print(f"Languages present in dataset: {languages}")
    
    train_splits = []
    val_splits = []
    test_splits = []
    
    for lang in languages:
        lang_data = raw_dataset[lang]
        df = lang_data.to_pandas()
        
        # Cast labels to int
        df['toxic'] = pd.to_numeric(df['toxic'], errors='coerce')
        # Drop row if text is null/NaN, empty string, or not string, or label is null/NaN or not 0 or 1
        df = df[
            df['text'].notna() & 
            df['text'].apply(lambda x: isinstance(x, str) and len(str(x).strip()) > 0) & 
            df['toxic'].isin([0, 1])
        ]
        
        df['toxic'] = df['toxic'].astype(int)
        df['lang'] = lang
        
        clean_lang_dataset = Dataset.from_pandas(df, preserve_index=False)
        
        # Split: Train/Val/Test (80/10/10)
        train_temp = clean_lang_dataset.train_test_split(test_size=0.2, seed=42)
        train_part = train_temp['train']
        
        val_test_part = train_temp['test'].train_test_split(test_size=0.5, seed=42)
        val_part = val_test_part['train']
        test_part = val_test_part['test']
        
        if downsample:
            # Take a small representative subset per language for CPU training
            # e.g., 150 train, 30 val, 30 test samples per language to yield better stability
            train_part = train_part.select(range(min(len(train_part), 150)))
            val_part = val_part.select(range(min(len(val_part), 30)))
            test_part = test_part.select(range(min(len(test_part), 30)))
            
        train_splits.append(train_part)
        val_splits.append(val_part)
        test_splits.append(test_part)
        
    train_dataset = concatenate_datasets(train_splits)
    val_dataset = concatenate_datasets(val_splits)
    test_dataset = concatenate_datasets(test_splits)
    
    # Rename 'toxic' column to 'label'
    train_dataset = train_dataset.rename_column("toxic", "label")
    val_dataset = val_dataset.rename_column("toxic", "label")
    test_dataset = test_dataset.rename_column("toxic", "label")
    
    return DatasetDict({
        'train': train_dataset,
        'validation': val_dataset,
        'test': test_dataset
    })

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    preds = np.argmax(predictions, axis=1)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average='binary', zero_division=0)
    acc = accuracy_score(labels, preds)
    return {
        'accuracy': acc,
        'f1': f1,
        'precision': precision,
        'recall': recall
    }

def balance_dataset(dataset, label_column='label'):
    """
    Balances dataset by oversampling the minority class to match the majority class.
    """
    df = dataset.to_pandas()
    counts = df[label_column].value_counts().to_dict()
    print("Class distribution before balancing:", counts)
    
    max_class_size = max(counts.values())
    balanced_dfs = []
    
    for cls, count in counts.items():
        cls_df = df[df[label_column] == cls]
        if count < max_class_size:
            # Oversample to match max_class_size
            oversampled_df = cls_df.sample(max_class_size, replace=True, random_state=42)
            balanced_dfs.append(oversampled_df)
        else:
            balanced_dfs.append(cls_df)
            
    balanced_df = pd.concat(balanced_dfs, ignore_index=True)
    print("Class distribution after balancing:", balanced_df[label_column].value_counts().to_dict())
    return Dataset.from_pandas(balanced_df, preserve_index=False)

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device selected for training: {device}")
    
    # Check output paths
    existing_model_dir = os.path.join(script_dir, "models", "multilingual-abuse-model")
    new_model_dir = os.path.join(script_dir, "models", "improved-model-v2")
    telugu_csv_path = os.path.join(project_dir, "dataset", "telugu_abusive_variants_dataset.csv")
    combined_dataset_dir = os.path.join(script_dir, "dataset", "combined_abuse_dataset_v2")
    
    print("\n--- Verifying Paths ---")
    print(f"Existing model path: {existing_model_dir}")
    print(f"Telugu CSV path: {telugu_csv_path}")
    
    if not os.path.exists(existing_model_dir):
        print(f"ERROR: Existing model directory not found at: {existing_model_dir}", file=sys.stderr)
        sys.exit(1)
        
    if not os.path.exists(telugu_csv_path):
        print(f"ERROR: Telugu abusive variantes CSV not found at: {telugu_csv_path}", file=sys.stderr)
        sys.exit(1)
        
    # 1. Load HF original toxicity dataset
    downsample = (device == "cpu")
    if "--full" in sys.argv:
        downsample = False
    elif "--downsample" in sys.argv:
        downsample = True
        
    orig_dataset = clean_and_split_original_dataset(downsample=downsample)
    print(f"Original train dataset size: {len(orig_dataset['train'])}")
    print(f"Original labels train split: {orig_dataset['train'].to_pandas()['label'].value_counts().to_dict()}")
    
    # 2. Load and split Telugu CSV dataset and introduce safe greetings
    print("\n--- Loading and Splitting Telugu CSV Dataset ---")
    te_df = pd.read_csv(telugu_csv_path)
    te_df = te_df.rename(columns={'language': 'lang'})
    
    # Introduce typical non-toxic greetings/questions in Romanized Telugu
    safe_telugu = [
        {"text": "namaskaram andi", "lang": "te-rom", "label": 0},
        {"text": "bagunnara", "lang": "te-rom", "label": 0},
        {"text": "tintunnara", "lang": "te-rom", "label": 0},
        {"text": "enti sangathulu", "lang": "te-rom", "label": 0},
        {"text": "chala bagundi", "lang": "te-rom", "label": 0},
        {"text": "dhanyavadalu", "lang": "te-rom", "label": 0},
        {"text": "nenu bagunnanu", "lang": "te-rom", "label": 0},
        {"text": "nuvvu ela unnavu", "lang": "te-rom", "label": 0},
        {"text": "repu kaluddam", "lang": "te-rom", "label": 0},
        {"text": "avunu", "lang": "te-rom", "label": 0},
        {"text": "kadu", "lang": "te-rom", "label": 0},
        {"text": "enti visheshalu", "lang": "te-rom", "label": 0},
        {"text": "nee peru enti", "lang": "te-rom", "label": 0},
        {"text": "naa peru tharun", "lang": "te-rom", "label": 0},
        {"text": "ekkadiki velthunnavu", "lang": "te-rom", "label": 0},
        {"text": "anniti kante mukhyamainadi", "lang": "te-rom", "label": 0},
        {"text": "chala dhanyavadalu andi", "lang": "te-rom", "label": 0},
        {"text": "subhadinam", "lang": "te-rom", "label": 0},
        {"text": "subharatri", "lang": "te-rom", "label": 0},
        {"text": "mallee kaluddam", "lang": "te-rom", "label": 0},
    ]
    safe_te_df = pd.DataFrame(safe_telugu)
    
    # Split both
    te_toxic_dataset = Dataset.from_pandas(te_df, preserve_index=False)
    te_safe_dataset = Dataset.from_pandas(safe_te_df, preserve_index=False)
    
    toxic_train_temp = te_toxic_dataset.train_test_split(test_size=0.2, seed=42)
    toxic_train = toxic_train_temp['train']
    toxic_val_test = toxic_train_temp['test'].train_test_split(test_size=0.5, seed=42)
    toxic_val = toxic_val_test['train']
    toxic_test = toxic_val_test['test']
    
    # Split safe Telugu data: 70% Train, 30% split between Val/Test
    safe_train_temp = te_safe_dataset.train_test_split(test_size=0.3, seed=42)
    safe_train = safe_train_temp['train']
    safe_val_test = safe_train_temp['test'].train_test_split(test_size=0.5, seed=42)
    safe_val = safe_val_test['train']
    safe_test = safe_val_test['test']
    
    te_train_part = concatenate_datasets([toxic_train, safe_train])
    te_val_part = concatenate_datasets([toxic_val, safe_val])
    te_test_part = concatenate_datasets([toxic_test, safe_test])
    
    print(f"Telugu dataset split size: Train={len(te_train_part)}, Val={len(te_val_part)}, Test={len(te_test_part)}")
    
    # 3. Combine Dataset splits
    print("\n--- Combining Datasets ---")
    combined_train = concatenate_datasets([orig_dataset['train'], te_train_part])
    combined_val = concatenate_datasets([orig_dataset['validation'], te_val_part])
    combined_test = concatenate_datasets([orig_dataset['test'], te_test_part])
    
    print(f"Combined size: Train={len(combined_train)}, Val={len(combined_val)}, Test={len(combined_test)}")
    
    # 4. Save combined dataset splits
    print(f"Saving combined dataset to: {combined_dataset_dir}")
    os.makedirs(combined_dataset_dir, exist_ok=True)
    combined_train.to_pandas().to_csv(os.path.join(combined_dataset_dir, "train.csv"), index=False, encoding='utf-8')
    combined_val.to_pandas().to_csv(os.path.join(combined_dataset_dir, "val.csv"), index=False, encoding='utf-8')
    combined_test.to_pandas().to_csv(os.path.join(combined_dataset_dir, "test.csv"), index=False, encoding='utf-8')
    print("Combined dataset saved successfully.")
    
    # 5. Prevent Dataset Imbalance
    print("\n--- Balancing Datasets ---")
    balanced_train = balance_dataset(combined_train, 'label')
    
    # 6. Load Tokenizer & Tokenize
    print("\n--- Loading Tokenizer ---")
    tokenizer = AutoTokenizer.from_pretrained(existing_model_dir)
    
    def tokenize_function(examples):
        return tokenizer(examples['text'], truncation=True, max_length=64)
        
    print("Tokenizing datasets...")
    tokenized_train = balanced_train.map(tokenize_function, batched=True)
    tokenized_val = combined_val.map(tokenize_function, batched=True)
    
    # 7. Load Existing fine-tuned checkpoint
    print("\n--- Loading Existing Fine-Tuned Model ---")
    model = AutoModelForSequenceClassification.from_pretrained(existing_model_dir, num_labels=2)
    
    # 8. Training Arguments
    # Continue fine-tuning with conservative settings
    epochs = 1 # Running 1 epoch is standard for secondary fine-tuning to prevent forgetting
    batch_size = 8 if downsample else 16
    
    training_args = TrainingArguments(
        output_dir=new_model_dir,
        learning_rate=1e-5, # Conservative learning rate
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
        train_dataset=tokenized_train,
        eval_dataset=tokenized_val,
        processing_class=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
        compute_metrics=compute_metrics
    )
    
    # 9. Continued training
    print("\n--- Continued Fine-Tuning ---")
    trainer.train()
    
    # 10. Save Model V2 separately
    print("\n--- Saving Improved Model V2 ---")
    print(f"Saving improved model to: {new_model_dir}")
    os.makedirs(new_model_dir, exist_ok=True)
    model.save_pretrained(new_model_dir)
    tokenizer.save_pretrained(new_model_dir)
    print("Completed. Model and tokenizer saved successfully.")

if __name__ == "__main__":
    main()
