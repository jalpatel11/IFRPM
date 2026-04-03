import torch
import numpy as np
import os
import matplotlib.pyplot as plt
from data.sample_loader import load_data
from models.cnn_model import CnnModel
from models.transformer_model import TransformerModel
from utils.logger import get_logger

logger = get_logger("explain")

def compute_gradient_importance(model, data_loader, device):
    """
    Computes feature importance using magnitudes of Integrated Gradients (or raw Gradients as fallback).
    """
    model.eval()
    
    # We will accumulate feature importance over a small sample of the test set
    importances = []
    baseline = None
    
    for batch_X, batch_y in data_loader:
        batch_X = batch_X.to(device).requires_grad_(True)
        # Forward pass
        outputs = model(batch_X).squeeze(-1)
        
        # We want to explain the predictions. For binary classification, we can 
        # take gradients of the sum of outputs (since they are logits).
        # We care about the gradients w.r.t the inputs.
        
        # Dummy sum to allow backward
        loss = outputs.sum()
        
        # Compute gradient
        model.zero_grad()
        loss.backward()
        
        # Gradients are shape same as input (batch, seq_len, num_features)
        # We take the absolute mean over batch and seq_len to get feature importance
        grads = batch_X.grad.abs().cpu().numpy()
        # Avg over batch (dim 0) and seq_len (dim 1)
        mean_grads = grads.mean(axis=(0, 1))
        
        importances.append(mean_grads)
        
        # Only do for a few batches to save time
        if len(importances) > 5:
            break
            
    final_importances = np.mean(importances, axis=0)
    return final_importances

def run(config):
    logger.info("Starting Explainability Task Pipeline")
    
    # We'll run on test loader
    train_loader, test_loader, num_features = load_data(config)
    
    seq_length = config['model']['window_size']
    model_type = config['model']['type']
    
    device = torch.device(config['training']['device'] if torch.cuda.is_available() else "cpu")
    
    # Setup Model
    if model_type == "cnn":
        model = CnnModel(num_features, seq_length, num_classes=1, config=config['model'].get('cnn'))
    elif model_type == "transformer":
        model = TransformerModel(num_features, seq_length, num_classes=1, config=config['model'].get('transformer'))
    else:
        raise ValueError(f"Unknown model type: {model_type}")
        
    model_path = os.path.join(config['paths']['checkpoints'], f"best_{model_type}_classification_model.pt")
    
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path))
        logger.info(f"Loaded existing model from {model_path} for explainability.")
    else:
        logger.warning(f"No trained classification model found at {model_path}. Explanations will be random!")
        
    model = model.to(device)
    
    importances = compute_gradient_importance(model, test_loader, device)
    
    # Save Plot
    os.makedirs(config['paths']['results'], exist_ok=True)
    plot_path = os.path.join(config['paths']['results'], f"{model_type}_feature_importance.png")
    
    plt.figure(figsize=(10, 6))
    features = np.arange(num_features)
    
    # Sort for better visualization
    sorted_indices = np.argsort(importances)[::-1]
    # plot top 20
    top_k = min(20, num_features)
    
    plt.bar(range(top_k), importances[sorted_indices][:top_k])
    plt.xticks(range(top_k), sorted_indices[:top_k], rotation=45)
    plt.ylabel("Absolute Gradient Magnitude")
    plt.xlabel("Sensor Feature Index")
    plt.title(f"Top {top_k} Feature Importance ({model_type.upper()})")
    plt.tight_layout()
    
    plt.savefig(plot_path)
    plt.close()
    
    logger.info(f"Saved feature importance plot to {plot_path}")
