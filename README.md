# Gravity Assist

An interactive 3D solar system simulation built with Three.js and Next.js. Explore orbital mechanics, launch probes, and learn about planets through hands-on experimentation.

## Features

- **Interactive Solar System** - Accurate planetary data with real orbital mechanics
- **Probe Launcher** - Launch probes from Earth with trajectory prediction
- **Gravity Assists** - Use planetary gravity to redirect probes
- **Planet Info** - Click planets to learn about their properties and composition
- **Multiple Modes** - Solar System, Three Body Problem, and Outer Wilds systems

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the simulation.

## Controls

**Mouse / touch**

- **Orbit**: left-click + drag (dragging never selects — only a click does)
- **Pan**: right-click + drag
- **Zoom**: scroll wheel or pinch
- **Select**: hover a body for its name, click for the full info panel

**Keyboard**

| Key | Action |
| --- | --- |
| `Space` | Pause / resume |
| `-` / `=` | Slow down / speed up (hold `Shift` for big steps) |
| `1`–`9` | Follow a body (press again to release) |
| `0` / `Esc` | Release the camera / close panels |
| `C` | Toggle the controls panel |
| `O` | Toggle orbit paths |
| `L` | Toggle planet labels |
| `D` | Toggle performance stats |
| `?` | Help & shortcuts |

## Tech Stack

- Next.js 15
- React 19
- Three.js / React Three Fiber
- Tailwind CSS
- Radix UI

## License

MIT
