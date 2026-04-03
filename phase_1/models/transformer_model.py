import torch
import torch.nn as nn
import math

class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super(PositionalEncoding, self).__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)  # (max_len, 1, d_model)
        self.register_buffer('pe', pe)

    def forward(self, x):
        # x: (seq_len, batch_size, d_model)
        x = x + self.pe[:x.size(0), :]
        return x

class TransformerModel(nn.Module):
    def __init__(self, num_features, seq_length, num_classes=1, config=None):
        super(TransformerModel, self).__init__()
        
        d_model = config.get('d_model', 64) if config else 64
        nhead = config.get('nhead', 4) if config else 4
        num_layers = config.get('num_layers', 2) if config else 2
        dim_feedforward = config.get('dim_feedforward', 256) if config else 256
        dropout = config.get('dropout', 0.1) if config else 0.1
        
        self.input_projection = nn.Linear(num_features, d_model)
        self.pos_encoder = PositionalEncoding(d_model, max_len=seq_length+100)
        
        encoder_layers = nn.TransformerEncoderLayer(d_model, nhead, dim_feedforward, dropout)
        self.transformer_encoder = nn.TransformerEncoder(encoder_layers, num_layers)
        
        self.fc = nn.Linear(d_model, num_classes)
        self.d_model = d_model

    def forward(self, x):
        # x is (batch, seq_len, num_features)
        
        # Project inputs to d_model
        x = self.input_projection(x) * math.sqrt(self.d_model)
        
        # PyTorch transformer expects (seq_len, batch, d_model)
        x = x.permute(1, 0, 2)
        x = self.pos_encoder(x)
        output = self.transformer_encoder(x)
        
        # Global average pooling over the sequence output (seq_len, batch, d_model)
        # Average over dim=0
        output = output.mean(dim=0)
        
        # Final fully connected layer
        output = self.fc(output)
        return output
