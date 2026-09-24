import sys
import os
import pandas as pd
from datasets import load_dataset, get_dataset_config_names

def inspect_dataset():
    report_path = os.path.join(os.path.dirname(__file__), "report.txt")
    
    # Configure stdout to handle print encoding errors gracefully code page
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass # python 2 or old python
        
    with open(report_path, "w", encoding="utf-8") as f:
        def log(msg=""):
            print(msg)
            f.write(str(msg) + "\n")
            
        log("=== Hugging Face Dataset Inspection ===")
        dataset_name = "textdetox/multilingual_toxicity_dataset"
        
        # 1. Check configs / languages
        try:
            configs = get_dataset_config_names(dataset_name)
            log(f"Available Configurations/Languages: {configs}")
        except Exception as e:
            log(f"Could not get configuration names: {e}")
            configs = []

        # 2. Loader
        log(f"Loading dataset '{dataset_name}'...")
        try:
            dataset_dict = {}
            if configs:
                # Load each config configuration
                for config in configs:
                    log(f"Loading config: {config}")
                    dataset_dict[config] = load_dataset(dataset_name, config)
                log("Loaded all configs successfully.")
            else:
                # Try loading default
                dataset = load_dataset(dataset_name)
                dataset_dict = {"default": dataset}
                log("Loaded default config successfully.")
                
            log("\n=== Dataset Structure & Stats ===")
            
            # Combine stats for overall dataset
            total_records = 0
            for name, data_split in dataset_dict.items():
                log(f"\n--- Config/Language: {name} ---")
                log(f"splits: {list(data_split.keys())}")
                for split_name, split_data in data_split.items():
                    df = split_data.to_pandas()
                    records_in_split = len(df)
                    total_records += records_in_split
                    log(f"  Split: {split_name}")
                    log(f"    Number of records: {records_in_split}")
                    log(f"    Column names: {list(df.columns)}")
                    
                    log("    First 2 rows:")
                    for idx, row in df.head(2).iterrows():
                        log(f"      Row {idx}: {row.to_dict()}")
                    
                    # Try to count label distribution
                    for col in df.columns:
                        if col.lower() in ['label', 'toxic', 'toxicity', 'class', 'is_toxic']:
                            log(f"    Label Distribution for column '{col}':")
                            counts = df[col].value_counts(dropna=False)
                            for val, cnt in counts.items():
                                log(f"      {val}: {cnt}")
                        if col.lower() in ['language', 'lang']:
                            log(f"    Languages present in column '{col}':")
                            counts = df[col].value_counts(dropna=False)
                            for val, cnt in counts.items():
                                log(f"      {val}: {cnt}")
            log(f"\nTotal records across all configurations/splits: {total_records}")
                            
        except Exception as e:
            log(f"Error loading dataset: {e}")
            import traceback
            traceback.print_exc(file=f)
            
    print(f"Inspection report written to {report_path}")

if __name__ == "__main__":
    inspect_dataset()
