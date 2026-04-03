#!/bin/bash
# run_all.sh

# Default parameters
DATASET_PATH="data/processed/ngafid_sample.csv"
ROWS=500
MODEL="cnn"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --dataset) DATASET_PATH="$2"; shift ;;
        --rows) ROWS="$2"; shift ;;
        --model) MODEL="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "=================================="
echo " Running NGAFID ML Pipeline Tasks"
echo " Dataset: $DATASET_PATH"
echo " Rows: $ROWS"
echo " Model: $MODEL"
echo "=================================="

echo "[1/3] Running Classification..."
python main.py --dataset "$DATASET_PATH" --rows "$ROWS" --model "$MODEL" --task classification

echo "[2/3] Running RUL Regression..."
python main.py --dataset "$DATASET_PATH" --rows "$ROWS" --model "$MODEL" --task rul

echo "[3/3] Running Explainability..."
python main.py --dataset "$DATASET_PATH" --rows "$ROWS" --model "$MODEL" --task explain

echo "All tasks finished!"
