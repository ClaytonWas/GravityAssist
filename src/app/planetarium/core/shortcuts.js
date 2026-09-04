// Single source of truth for keyboard shortcuts.
// PlanetariumScene implements these; HelpDialog renders them.
export const SHORTCUT_GROUPS = [
  {
    title: 'Simulation',
    items: [
      { keys: ['Space'], description: 'Pause or resume' },
      { keys: ['-'], description: 'Slow down' },
      { keys: ['='], description: 'Speed up' },
      { keys: ['Shift', '-'], description: 'Slow down a lot' },
      { keys: ['Shift', '='], description: 'Speed up a lot' }
    ]
  },
  {
    title: 'Camera',
    items: [
      { keys: ['1', 'to', '9'], description: 'Follow a body, press again to release' },
      { keys: ['0'], description: 'Release the camera' },
      { keys: ['Drag'], description: 'Orbit the view' },
      { keys: ['Right-drag'], description: 'Pan the view' },
      { keys: ['Scroll'], description: 'Zoom in and out' }
    ]
  },
  {
    title: 'Interface',
    items: [
      { keys: ['Click'], description: 'Open the info panel for a body' },
      { keys: ['C'], description: 'Toggle the controls panel' },
      { keys: ['O'], description: 'Toggle orbit paths' },
      { keys: ['L'], description: 'Toggle planet labels' },
      { keys: ['D'], description: 'Toggle performance stats' },
      { keys: ['?'], description: 'Open this help' },
      { keys: ['Esc'], description: 'Close panels, then release the camera' }
    ]
  }
];

export const GUIDE_SECTIONS = [
  {
    title: 'Getting around',
    items: [
      'Drag to orbit, scroll or pinch to zoom, right-drag to pan.',
      'Click any planet, moon or probe to open its info panel.',
      'Press 1 to 9, or use the Camera tab, to lock the camera onto a body. It will travel with it.',
      'Press 0 or Esc to release the camera and fly free again.'
    ]
  },
  {
    title: 'Bending time',
    items: [
      'The speed control sets how many seconds of simulated time pass per real second.',
      'Use the preset buttons for a quick jump, or the slider for fine control.',
      'Pause at any moment to line up a launch, then resume to watch it play out.'
    ]
  },
  {
    title: 'Flying probes',
    items: [
      'Open the Launch tab and press Prepare launch to arm a trajectory preview.',
      'The amber line predicts where the probe will drift given the current burn.',
      'Adjust speed, azimuth and elevation until the preview reaches your target, then launch.',
      'Skim a planet closely and its gravity will slingshot you. That is the gravity assist.'
    ]
  },
  {
    title: 'Missions and worlds',
    items: [
      'The Missions tab tracks objectives and updates as your probes arrive.',
      'The Levels tab swaps between the Solar System, a chaotic three-body system, and more.',
      'Planet panels include real composition data, orbital figures and surface facts.'
    ]
  }
];
