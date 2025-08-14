#!/bin/bash

# ====================
# Google Cloud VM Setup Script
# ====================

echo "🚀 Setting up Google Cloud VM for Docker Compose..."

# Update system
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Docker
echo "📦 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Apply new group membership immediately
newgrp docker <<EONG
echo "✅ Docker group applied — you can now run Docker without sudo."
EONG

# Install Docker Compose
echo "📦 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git (if not already installed)
sudo apt-get install -y git curl

# Create app directory
mkdir -p ~/app
cd ~/app

# Clone your repository (replace with your repo)
# git clone https://github.com/yourusername/your-repo.git .

echo "✅ Docker and Docker Compose installed successfully!"
echo "📋 Next steps:"
echo "1. Clone your repository to ~/app"
echo "2. Create your .env.production file"
echo "3. Run 'docker-compose up -d' to start your application"