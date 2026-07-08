import option1Poster from "../assets/images/hero-videos/rsac-earth-studio-up-poster.jpg";

import option1Video from "../assets/videos/rsac-earth-studio-up.mp4";
// Lanczos-upscaled + lightly sharpened encode for large/high-DPI screens,
// where the 1280px master would be stretched ~2× and look soft/pixelated.
import option1VideoLarge from "../assets/videos/rsac-earth-studio-up-1920.mp4";

export const heroVideos = [
  {
    id: "option-1",
    title: "Satellite approach to Uttar Pradesh",
    fileName: "rsac-earth-studio-up.mp4",
    video: option1Video,
    videoLarge: option1VideoLarge,
    poster: option1Poster,
  },
];

export const activeHeroVideo = heroVideos[0];
