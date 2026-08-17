/**
 * Device detection and mobile optimization utilities
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasTouch: boolean;
  deviceLabel: string;
  osName: string;
}

export function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isIOS: false,
      isAndroid: false,
      hasTouch: false,
      deviceLabel: 'Escritorio',
      osName: 'Desktop',
    };
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // iOS detection (iPhone, iPod, iPad including iPadOS with desktop UA)
  const isIPhone = /iPhone|iPod/i.test(userAgent);
  const isIPad = /iPad/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIOS = isIPhone || isIPad;

  // Android detection
  const isAndroid = /Android/i.test(userAgent);
  const isAndroidTablet = isAndroid && !/Mobile/i.test(userAgent);
  const isAndroidPhone = isAndroid && /Mobile/i.test(userAgent);

  // General mobile vs tablet vs desktop
  const isTablet = isIPad || isAndroidTablet || (hasTouch && window.innerWidth >= 768 && window.innerWidth <= 1024);
  const isMobile = (isIPhone || isAndroidPhone || /Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || (hasTouch && window.innerWidth < 768)) && !isTablet;
  const isDesktop = !isMobile && !isTablet;

  let osName = 'Escritorio';
  if (isIPhone) osName = 'iPhone (iOS)';
  else if (isIPad) osName = 'iPad (iPadOS)';
  else if (isAndroidPhone) osName = 'Android Móvil';
  else if (isAndroidTablet) osName = 'Android Tablet';
  else if (/Macintosh|Mac OS X/i.test(userAgent)) osName = 'macOS';
  else if (/Windows/i.test(userAgent)) osName = 'Windows';
  else if (/Linux/i.test(userAgent)) osName = 'Linux';

  let deviceLabel = 'Escritorio';
  if (isMobile) {
    deviceLabel = isIOS ? 'iPhone Móvil' : 'Móvil Android';
  } else if (isTablet) {
    deviceLabel = isIOS ? 'iPad Tablet' : 'Tablet';
  }

  return {
    isMobile,
    isTablet,
    isDesktop,
    isIOS,
    isAndroid,
    hasTouch,
    deviceLabel,
    osName,
  };
}
