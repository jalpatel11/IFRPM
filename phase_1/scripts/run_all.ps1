param (
    [string]$dataset = "data/processed/ngafid_sample.csv",
    [int]$rows = 500,
    [string]$model = "cnn"
)

Write-Host "=================================="
Write-Host " Running NGAFID ML Pipeline Tasks"
Write-Host " Dataset: $dataset"
Write-Host " Rows: $rows"
Write-Host " Model: $model"
Write-Host "=================================="

Write-Host "[1/3] Running Classification..."
python main.py --dataset $dataset --rows $rows --model $model --task classification

Write-Host "[2/3] Running RUL Regression..."
python main.py --dataset $dataset --rows $rows --model $model --task rul

Write-Host "[3/3] Running Explainability..."
python main.py --dataset $dataset --rows $rows --model $model --task explain

Write-Host "All tasks finished!"
