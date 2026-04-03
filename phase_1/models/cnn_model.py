import torch
import torch.nn as nn
import torch.nn.functional as F

class CnnModel(nn.Module):
    def __init__(self, num_features, seq_length, num_classes=1, config=None):
        super(CnnModel, self).__init__()
        
        # Default config or apply from file
        filters = config.get('filters', [64, 128, 256]) if config else [64, 128, 256]
        kernel_size = config.get('kernel_size', 3) if config else 3
        dropout = config.get('dropout', 0.3) if config else 0.3
        
        # 1D Conv expects input shape: (batch_size, in_channels, sequence_length)
        # So we treat features as channels
        
        self.conv1 = nn.Conv1d(in_channels=num_features, out_channels=filters[0], kernel_size=kernel_size, padding=kernel_size//2)
        self.bn1 = nn.BatchNorm1d(filters[0])
        self.pool1 = nn.MaxPool1d(2)
        
        self.conv2 = nn.Conv1d(in_channels=filters[0], out_channels=filters[1], kernel_size=kernel_size, padding=kernel_size//2)
        self.bn2 = nn.BatchNorm1d(filters[1])
        self.pool2 = nn.MaxPool1d(2)
        
        self.conv3 = nn.Conv1d(in_channels=filters[1], out_channels=filters[2], kernel_size=kernel_size, padding=kernel_size//2)
        self.bn3 = nn.BatchNorm1d(filters[2])
        self.pool3 = nn.AdaptiveAvgPool1d(1) # global avg pooling
        
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(filters[2], num_classes)

    def forward(self, x):
        # x is (batch, seq_len, num_features)
        # Permute to (batch, num_features, seq_len)
        x = x.permute(0, 2, 1)
        
        x = self.pool1(F.relu(self.bn1(self.conv1(x))))
        x = self.pool2(F.relu(self.bn2(self.conv2(x))))
        x = self.pool3(F.relu(self.bn3(self.conv3(x))))
        
        x = x.view(x.size(0), -1) # flatten
        x = self.dropout(x)
        x = self.fc(x)
        
        # The loss function (BCEWithLogitsLoss) handles sigmoid internally
        return x
