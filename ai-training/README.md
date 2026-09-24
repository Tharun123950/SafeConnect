# Multilingual AI Abuse Detection Training Module

This module sets up an isolated environment and provides pipeline scripts for training and evaluating multilingual toxicity classification models.

---

## Directory Structure

```text
ai-training/
├── dataset/            # Store raw/downloaded/cleaned dataset splits
├── models/             # Save model checkpoints & trained classifiers
│   └── multilingual-abuse-model/ # Fine-tuned XLM-RoBERTa model files
├── train.py            # Dataset cleaning, splitting, & training script
├── evaluate.py         # Model evaluation script (loads saved model)
├── requirements.txt    # Python packages needed
└── README.md           # Documentation (this file)
```

---

## Setup & Execution

1. **Environment Setup**:
   ```bash
   python -m venv ai-training/.venv
   ai-training/.venv/Scripts/pip install -r ai-training/requirements.txt
   ```

2. **Run Model Training**:
   Run training (downsampled CPU run by default; use `--full` for full GP/CPU training on all 71k records):
   ```bash
   ai-training/.venv/Scripts/python ai-training/train.py
   ```

3. **Run Model Evaluation**:
   ```bash
   ai-training/.venv/Scripts/python ai-training/evaluate.py
   ```

---

## Dataset Characteristics
We clean and analyze the Hugging Face dataset `textdetox/multilingual_toxicity_dataset` (default config).

* **Total Cleaned Records**: 71,374 (100% of raw dataset contains clean labels)
* **Toxic Label (1)**: 35,507 (~49.75%)
* **Non-Toxic Label (0)**: 35,867 (~50.25%)
* **Fields**: `text` (string), `toxic` (0 or 1), `lang` (source language)
* **Dataset Splits**: Stratified per-language into Train (80%), Validation (10%), and Test (10%).

---

## Training Run & Evaluation Metrics (CPU Downsampled Demo)

The model is fine-tuned from `xlm-roberta-base` for 1 epoch on a representative downsampled dataset (750 training, 150 validation, 150 test samples) spanning all 15 included languages.

### 1. Overall Test Split Results
* **Accuracy**: `0.5733`
* **Precision**: `0.7500`
* **Recall**: `0.0882`
* **F1-score**: `0.1579`

#### Confusion Matrix
* **True Negatives** (Non-toxic correct): 80
* **False Positives** (False alarms): 2
* **False Negatives** (Missed toxicity): 62
* **True Positives** (Toxic correct): 6

---

### 2. Per-Language Results (Test Split)

The following 15 languages were included and evaluated in this model training run. No other languages are claimed to be supported:

| Language | Records | Accuracy | Precision | Recall | F1-Score |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **am** (Amharic) | 10 | 0.5000 | 0.0000 | 0.0000 | 0.0000 |
| **ar** (Arabic) | 10 | 0.6000 | 1.0000 | 0.2000 | 0.3333 |
| **de** (German) | 10 | 0.7000 | 0.0000 | 0.0000 | 0.0000 |
| **en** (English) | 10 | 0.3000 | 0.0000 | 0.0000 | 0.0000 |
| **es** (Spanish) | 10 | 0.7000 | 0.0000 | 0.0000 | 0.0000 |
| **fr** (French) | 10 | 0.3000 | 0.0000 | 0.0000 | 0.0000 |
| **he** (Hebrew) | 10 | 0.7000 | 0.0000 | 0.0000 | 0.0000 |
| **hi** (Hindi) | 10 | 0.7000 | 0.0000 | 0.0000 | 0.0000 |
| **hin** (Hinglish) | 10 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| **it** (Italian) | 10 | 0.7000 | 0.0000 | 0.0000 | 0.0000 |
| **ja** (Japanese) | 10 | 0.7000 | 0.0000 | 0.0000 | 0.0000 |
| **ru** (Russian) | 10 | 0.3000 | 0.0000 | 0.0000 | 0.0000 |
| **tt** (Tatar) | 10 | 0.8000 | 0.7143 | 1.0000 | 0.8333 |
| **uk** (Ukrainian) | 10 | 0.3000 | 0.0000 | 0.0000 | 0.0000 |
| **zh** (Chinese) | 10 | 0.7000 | 0.0000 | 0.0000 | 0.0000 |
