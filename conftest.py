import sys
import os

# Insert root directory into sys.path for pytest module resolution
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
