import { Timer, Repeat, Plus } from "lucide-react";

export const PROGRESSION_OPTIONS = [
  {
    key: "tempo",
    label: "Slower tempo",
    icon: <Timer className="h-4 w-4 text-primary" />,
    cue: "Keep the same weight and slow it down — around 3 seconds lowering, 1 second lifting. You work harder and build control without adding load. Great when the weight feels right but you want more challenge.",
  },
  {
    key: "reps",
    label: "Max reps on last set",
    icon: <Repeat className="h-4 w-4 text-primary" />,
    cue: "Keep your weight the same. On your final set only, aim for as many clean reps as you can and try to beat last time. Stop the set the moment form slips — quality over numbers.",
  },
  {
    key: "weight",
    label: "Small weight increase",
    icon: <Plus className="h-4 w-4 text-primary" />,
    cue: "Only if last session felt strong and every rep was clean: add a little — about 2.5kg, or 2kg on dumbbells. Small jumps keep progress steady and safe. If in doubt, stay where you are for another week.",
  },
];

export const REWARD_ITEMS = [
  { weight: 0.2, name: "Apple", plural: "Apples", emoji: "🍎" },
  { weight: 1, name: "Chicken", plural: "Chickens", emoji: "🐔" },
  { weight: 2, name: "Brick", plural: "Bricks", emoji: "🧱" },
  { weight: 5, name: "Cat", plural: "Cats", emoji: "🐈" },
  { weight: 7, name: "Bowling Ball", plural: "Bowling Balls", emoji: "🎳" },
  { weight: 10, name: "Watermelon", plural: "Watermelons", emoji: "🍉" },
  { weight: 15, name: "Car Tire", plural: "Car Tires", emoji: "🛞" },
  { weight: 20, name: "Microwave", plural: "Microwaves", emoji: "📻" },
  { weight: 40, name: "Toilet", plural: "Toilets", emoji: "🚽" },
  { weight: 50, name: "Large Dog", plural: "Large Dogs", emoji: "🐕" },
  { weight: 100, name: "Baby Elephant", plural: "Baby Elephants", emoji: "🐘" },
  { weight: 200, name: "Motorcycle", plural: "Motorcycles", emoji: "🏍️" },
  { weight: 250, name: "Grizzly Bear", plural: "Grizzly Bears", emoji: "🐻" },
  {
    weight: 300,
    name: "Vending Machine",
    plural: "Vending Machines",
    emoji: "🥤",
  },
  { weight: 500, name: "Horse", plural: "Horses", emoji: "🐎" },
  {
    weight: 1000,
    name: "Great White Shark",
    plural: "Great White Sharks",
    emoji: "🦈",
  },
  { weight: 1500, name: "Hippopotamus", plural: "Hippopotamuses", emoji: "🦛" },
  { weight: 2000, name: "Rhinoceros", plural: "Rhinoceroses", emoji: "🦏" },
  { weight: 3000, name: "Killer Whale", plural: "Killer Whales", emoji: "🐋" },
  { weight: 4000, name: "Helicopter", plural: "Helicopters", emoji: "🚁" },
  {
    weight: 5000,
    name: "Monster Truck",
    plural: "Monster Trucks",
    emoji: "🛻",
  },
  { weight: 7500, name: "T-Rex", plural: "T-Rexes", emoji: "🦖" },
  { weight: 10000, name: "School Bus", plural: "School Buses", emoji: "🚌" },
  { weight: 15000, name: "Fighter Jet", plural: "Fighter Jets", emoji: "🛩️" },
  {
    weight: 25000,
    name: "Humpback Whale",
    plural: "Humpback Whales",
    emoji: "🐳",
  },
  {
    weight: 50000,
    name: "Space Shuttle",
    plural: "Space Shuttles",
    emoji: "🚀",
  },
  { weight: 150000, name: "Blue Whale", plural: "Blue Whales", emoji: "🐋" },
  { weight: 400000, name: "Boeing 747", plural: "Boeing 747s", emoji: "✈️" },
];

export const playPing = () => {
  try {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1000, ctx.currentTime);

    gainNode.gain.setValueAtTime(1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};
