import numpy as np

def create_windows(sequence, target, window_size, stride):
    """
    Extract sliding windows from a sequence
    sequence: (seq_len, num_features)
    target: (seq_len, )
    
    Takes the target value of the LAST timestep in the window.
    """
    seq_len = len(sequence)
    X, y = [], []
    
    if seq_len <= window_size:
        # Pad sequence if it's smaller than window size
        pad_len = window_size - seq_len
        pad_X = np.pad(sequence, ((0, pad_len), (0, 0)), mode='constant')
        pad_y = np.pad(target, (0, pad_len), mode='edge') # or pad with last value
        X.append(pad_X)
        y.append(pad_y[-1]) # last element label
        return np.array(X), np.array(y)
    
    for i in range(0, seq_len - window_size + 1, stride):
        X.append(sequence[i:i+window_size])
        y.append(target[i+window_size-1]) # Use the label at the end of the window
        
    return np.array(X), np.array(y)
