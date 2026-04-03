import matplotlib.pyplot as plt
import os

def plot_losses(train_losses, val_losses, filepath):
    """
    Plot and save training and testing/validation losses as requested by user.
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    plt.figure(figsize=(10, 6))
    
    epochs = range(1, len(train_losses) + 1)
    
    plt.plot(epochs, train_losses, label='Training Loss', marker='o')
    if val_losses and len(val_losses) == len(train_losses):
        plt.plot(epochs, val_losses, label='Validation Loss', marker='x')
        
    plt.title('Training and Validation Loss')
    plt.xlabel('Epochs')
    plt.ylabel('Loss')
    plt.legend()
    plt.grid(True)
    plt.savefig(filepath)
    plt.close()
