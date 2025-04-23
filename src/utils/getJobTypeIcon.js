import AerialSpraying from '../assets/icons/Aerial Spraying.svg';
import GroundSpraying from '../assets/icons/Ground Spraying.svg';
import DroneSpraying from '../assets/icons/Drone Spraying.svg';
import Fertilizing from '../assets/icons/Fertilizing.svg';
import Seeding from '../assets/icons/Seeding.svg';
import Tillage from '../assets/icons/Tillage.svg';
import Custom from '../assets/icons/Custom.svg';

export const getJobTypeIcon = (type = '') => {
  const name = typeof type === 'string'
    ? type.toLowerCase()
    : type?.name?.toLowerCase?.() || '';

  if (name.includes('aerial')) return AerialSpraying;
  if (name.includes('ground')) return GroundSpraying;
  if (name.includes('drone')) return DroneSpraying;

  if (name.includes('spray')) return AerialSpraying; // fallback for generic spraying
  if (name.includes('seed')) return Seeding;
  if (name.includes('fert')) return Fertilizing;
  if (name.includes('till')) return Tillage;

  return Custom;
};

