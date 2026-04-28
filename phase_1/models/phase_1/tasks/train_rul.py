import torch
import numpy as np
import os
from data.sample_loader import load_data
from models.cnn_model import CnnModel
from models.transformer_model import TransformerModel
from models.trainer import train_model
from utils.logger import get_logger
from utils.metrics import calculate_regression_metrics, save_metrics

logger = get_logger("train_rul")

def run(config):
    logger.info("Starting RUL Regression Task Pipeline")
    
    # 1. Load Data
    train_loader, test_loader, num_features = load_data(config)
    logger.info(f"Dataloaders initialized. Feature count: {num_features}")
    
    seq_length = config['model']['window_size']
    model_type = config['model']['type']
    
    # 2. Setup Model
    if model_type == "cnn":
        model = CnnModel(num_features, seq_length, num_classes=1, config=config['model'].get('cnn'))
    elif model_type == "transformer":
        model = TransformerModel(num_features, seq_length, num_classes=1, config=config['model'].get('transformer'))
    else:
        raise ValueError(f"Unknown model type: {model_type}")
        
    # 3. Train
    best_model = train_model(model, train_loader, test_loader, config, task_type="rul")
    
    # 4. Evaluate
    device = torch.device(config['training']['device'] if torch.cuda.is_available() else "cpu")
    best_model.eval()
    
    all_preds = []
    all_targets = []
    
    with torch.no_grad():
        for batch_X, batch_y in test_loader:
            batch_X = batch_X.to(device)
            # Model outputs direct values (no sigmoid)
            outputs = best_model(batch_X).squeeze(-1).cpu().numpy()
            
            all_preds.extend(outputs)
            all_targets.extend(batch_y.numpy())
            
    metrics = calculate_regression_metrics(np.array(all_targets), np.array(all_preds))
    
    results_path = os.path.join(config['paths']['results'], f"{model_type}_rul_metrics.json")
    save_metrics(metrics, results_path)
    
    logger.info(f"Evaluation complete. Metrics: {metrics}")
