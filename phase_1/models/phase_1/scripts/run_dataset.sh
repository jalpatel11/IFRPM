#!/bin/bash
# run_dataset.sh
# Scalable script dispatching tasks per datasets

DATASET=$1

if [ -z "$DATASET" ]; then
    echo "Usage: bash run_dataset.sh <dataset_name>"
    exit 1
fi

if [ "$DATASET" == "ngafid" ]; then
    echo "Delegating NGAFID Dataset Pipeline..."
    bash scripts/run_all.sh --dataset "data/processed/ngafid_sample.csv" --rows 500 --model cnn
elif [ "$DATASET" == "other_dataset" ]; then
    echo "Dataset other_dataset is a placeholder. Implementing later..."
else
    echo "Unknown dataset '$DATASET'"
    exit 1
fi
