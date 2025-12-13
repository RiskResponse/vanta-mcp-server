#!/bin/bash
# Vanta MCP Server Setup Script for macOS/Linux

set -e

echo "======================================"
echo "  Vanta MCP Server Setup"
echo "======================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. You have $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "📁 Installing from: $SCRIPT_DIR"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
cd "$SCRIPT_DIR"
npm install --production --silent 2>/dev/null || npm install --production
echo "✅ Dependencies installed"

# Prompt for credentials
echo ""
echo "🔐 Enter your Vanta API credentials"
echo "   (Get these from Vanta → Settings → Developer console → + Create)"
echo ""

read -p "   VANTA_CLIENT_ID: " VANTA_CLIENT_ID
read -p "   VANTA_CLIENT_SECRET: " VANTA_CLIENT_SECRET

if [ -z "$VANTA_CLIENT_ID" ] || [ -z "$VANTA_CLIENT_SECRET" ]; then
    echo "❌ Credentials are required"
    exit 1
fi

# Determine config path
if [ -d "$HOME/.cursor" ] || command -v cursor &> /dev/null; then
    CONFIG_DIR="$HOME/.cursor"
    CONFIG_FILE="$CONFIG_DIR/mcp.json"
    IDE_NAME="Cursor"
elif [ -d "$HOME/Library/Application Support/Claude" ]; then
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
    CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
    IDE_NAME="Claude Desktop"
else
    CONFIG_DIR="$HOME/.cursor"
    CONFIG_FILE="$CONFIG_DIR/mcp.json"
    IDE_NAME="Cursor"
fi

echo ""
echo "📝 Configuring $IDE_NAME..."
echo "   Config file: $CONFIG_FILE"

# Create config directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

# Build the Vanta server config
DIST_PATH="$SCRIPT_DIR/dist/index.js"
VANTA_CONFIG=$(cat << EOF
{
  "command": "node",
  "args": ["$DIST_PATH"],
  "env": {
    "VANTA_CLIENT_ID": "$VANTA_CLIENT_ID",
    "VANTA_CLIENT_SECRET": "$VANTA_CLIENT_SECRET",
    "VANTA_SCOPES": "vanta-api.all:read"
  }
}
EOF
)

# Check if config file exists and has content
if [ -f "$CONFIG_FILE" ] && [ -s "$CONFIG_FILE" ]; then
    echo "   Existing config found."
    
    # Check if jq is available for JSON merging
    if command -v jq &> /dev/null; then
        # Check if vanta is already configured
        if jq -e '.mcpServers.vanta' "$CONFIG_FILE" > /dev/null 2>&1; then
            echo "   ⚠️  Vanta MCP server already configured."
            read -p "   Do you want to update it? (y/n): " UPDATE_CHOICE
            if [ "$UPDATE_CHOICE" != "y" ] && [ "$UPDATE_CHOICE" != "Y" ]; then
                echo "   Keeping existing configuration."
                exit 0
            fi
            echo "   Updating existing Vanta configuration..."
        else
            echo "   Adding Vanta to existing configuration..."
        fi
        
        # Backup existing config
        cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
        echo "   Backup saved to ${CONFIG_FILE}.backup"
        
        # Add/update the vanta server in existing config
        jq --argjson vanta "$VANTA_CONFIG" '.mcpServers.vanta = $vanta' "$CONFIG_FILE" > "${CONFIG_FILE}.tmp" && mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
        
        echo "✅ Vanta server configured"
    else
        # No jq available - show manual instructions
        echo ""
        echo "   ⚠️  Cannot auto-merge (jq not installed)."
        echo ""
        echo "   Please manually add this to your $CONFIG_FILE"
        echo "   inside the \"mcpServers\" object:"
        echo ""
        echo "   \"vanta\": $VANTA_CONFIG"
        echo ""
        echo "   Or install jq and run this script again:"
        echo "   brew install jq"
        exit 0
    fi
else
    # No existing config - create new one
    echo "   Creating new configuration..."
    
    cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "vanta": $VANTA_CONFIG
  }
}
EOF
    echo "✅ Configuration saved"
fi

# Done
echo ""
echo "======================================"
echo "  Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Restart $IDE_NAME"
echo "  2. Ask: \"What Vanta compliance tests are failing?\""
echo ""
