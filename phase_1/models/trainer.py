import torch
import torch.nn as nn
import torch.optim as optim
import os
import numpy as np
from utils.logger import get_logger
from utils.plotter import plot_losses

logger = get_logger("trainer")

def train_model(model, train_loader, val_loader, config, task_type="classification"):
    device = torch.device(config['training']['device'] if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    
    epochs = config['training']['epochs']
    lr = config['training']['lr']
    patience = config['training']['patience']
    
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    if task_type == "classification":
        # Check if we should use class weights
        criterion = nn.BCEWithLogitsLoss()
    else: # RUL regression
        criterion = nn.MSELoss()
        
    best_val_loss = float('inf')
    epochs_no_improve = 0
    
    checkpoint_dir = config['paths']['checkpoints']
    os.makedirs(checkpoint_dir, exist_ok=True)
    best_model_path = os.path.join(checkpoint_dir, f"best_{config['model']['type']}_{task_type}_model.pt")
    
    train_loss_history = []
    val_loss_history = []
    
    logger.info(f"Starting training on {device} for {epochs} epochs. Task: {task_type}")
    
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        
        for batch_X, batch_y in train_loader:
            batch_X, batch_y = batch_X.to(device), batch_y.to(device)
            
            optimizer.zero_grad()
            outputs = model(batch_X).squeeze(-1)
            
            if task_type == "classification":
                # Ensure labels are same type for BCE
                batch_y = batch_y.float()
            
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * batch_X.size(0)
            
        train_loss /= len(train_loader.dataset)
        train_loss_history.append(train_loss)
        
        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch_X, batch_y in val_loader:
                batch_X, batch_y = batch_X.to(device), batch_y.to(device)
                outputs = model(batch_X).squeeze(-1)
                if task_type == "classification":
                    batch_y = batch_y.float()
                loss = criterion(outputs, batch_y)
                val_loss += loss.item() * batch_X.size(0)
                
        val_loss /= len(val_loader.dataset)
        val_loss_history.append(val_loss)
        
        logger.info(f"Epoch {epoch+1}/{epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            epochs_no_improve = 0
            torch.save(model.state_dict(), best_model_path)
            logger.info(f"Saved new best model with Val Loss: {best_val_loss:.4f}")
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                logger.info(f"Early stopping triggered after {epoch+1} epochs.")
                break
                
    # Save Loss Plots
    plot_path = os.path.join(config['paths']['results'], f"{config['model']['type']}_{task_type}_loss_plot.png")
    plot_losses(train_loss_history, val_loss_history, plot_path)
    logger.info(f"Saved loss plots to {plot_path}")
    
    # Load best model for evaluation
    model.load_dict = torch.load(best_model_path)
    return model
