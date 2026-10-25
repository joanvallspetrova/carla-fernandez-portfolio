export interface LocalizedString {
  en: string;
  es: string;
}

export interface ModelStats {
  height: string;
  bust: string;
  waist: string;
  hips: string;
  shoe: string;
  dress: string;
  hair: LocalizedString;
  eyes: LocalizedString;
  base: string;
}

export interface ContactInfo {
  email: string;
  instagram: string;
  instagramUrl: string;
  agencyName?: string;
  agencyUrl?: string;
}

export interface PhotoItem {
  id: string;
  src: string;
  jpgSrc?: string;
  category: 'book' | 'digitals';
  title: string;
  visible: boolean;
  blackAndWhite: boolean;
  span?: 'normal' | 'wide';
  aspectRatio?: 'portrait' | 'landscape';
  order: number;
  width?: number;
  height?: number;
}

export interface DigitalVideo {
  src: string;
  visible: boolean;
  title: string;
}

export interface CompCardConfig {
  frontPhotoId: string;
  backPhotoIds: string[];
}

export interface PortfolioData {
  updatedAt: string;
  profile: {
    name: string;
    firstName: string;
    lastName: string;
    stats: ModelStats;
    contact: ContactInfo;
  };
  heroPhotoId: string;
  compCard: CompCardConfig;
  photos: PhotoItem[];
  digitalVideo: DigitalVideo;
}
