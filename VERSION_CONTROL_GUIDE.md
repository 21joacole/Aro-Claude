# Version Control System

Your photography studio application now has a complete version control system that saves and loads your entire scene setup.

## Features

### Save Version
- Click "Save Project" button to save the current state
- Automatically creates a project if you don't have one
- Saves:
  - All lighting positions, powers, sizes, rotations, and colors
  - Camera settings (ISO, f-stop, shutter speed, exposure compensation)
  - Camera position and target
  - Model information

### Load Version
- Click "Load Project" button to view all saved versions
- Shows:
  - Version name
  - Description
  - Save date and time
- Click any version to restore it completely
- All lights, camera settings, and positions will be restored exactly as saved

## How It Works

The system uses your Supabase database to store:

1. **Projects** - Top-level containers for organizing multiple scene versions
2. **Scenes** - Individual saved versions with complete state
3. **Lights** - All light rigs with their configurations
4. **Camera Settings** - Exposure triangle and position data

## Usage Tips

- Save different lighting setups with descriptive names
- Use the description field to note what makes each version unique
- Load previous versions to compare different lighting approaches
- Each save creates a new version (non-destructive)

## Database Tables Used

- `projects` - Project containers
- `scenes` - Scene snapshots
- `lights` - Light rig configurations
- All data is tied to your user account and protected by Row Level Security
