import argparse
import yaml
import os
from utils.seed import set_seed
from utils.logger import get_logger

import tasks.train_classification as t_class
import tasks.train_rul as t_rul
import tasks.explain as t_explain

def load_config(config_path):
    with open(config_path, 'r') as file:
        config = yaml.safe_load(file)
    return config

def main():
    parser = argparse.ArgumentParser(description="NGAFID ML Pipeline")
    parser.add_argument('--config', type=str, default='configs/config.yaml', help='Path to config file')
    parser.add_argument('--dataset', type=str, default=None, help='Override dataset path')
    parser.add_argument('--rows', type=int, default=None, help='Override max_rows')
    parser.add_argument('--model', type=str, default=None, help='Override model type (cnn|transformer)')
    parser.add_argument('--task', type=str, default=None, help='Override task type (classification|rul|explain|all)')
    
    args = parser.parse_args()
    config = load_config(args.config)
    
    if args.dataset: config['dataset']['path'] = args.dataset
    if args.rows is not None: config['dataset']['max_rows'] = args.rows
    if args.model: config['model']['type'] = args.model
    if args.task: config['task']['type'] = args.task
        
    set_seed(config['training']['seed'])
    logger = get_logger("main")
    
    logger.info(f"Starting pipeline with Task: {config['task']['type']} and Model: {config['model']['type']}")
    
    task_type = config['task']['type']
    
    if task_type == 'classification':
        t_class.run(config)
    elif task_type == 'rul':
        t_rul.run(config)
    elif task_type == 'explain':
        t_explain.run(config)
    elif task_type == 'all':
        # Sequentially run all
        config['task']['type'] = 'classification'
        t_class.run(config)
        
        config['task']['type'] = 'rul'
        t_rul.run(config)
        
        config['task']['type'] = 'explain'
        t_explain.run(config)
    else:
        logger.error(f"Unknown task type: {task_type}")

if __name__ == "__main__":
    main()
