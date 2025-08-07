// Utility functions for fetching medical quotes and facts

import { getRandomQuote, getQuotes } from '../services/doctorApi';

/**
 * Get a random medical quote or fact from the backend API
 * @returns A random quote/fact string
 */
export const getRandomMedicalQuote = async (): Promise<string> => {
  try {
    // Try to fetch from backend API first
    const response = await getRandomQuote();
    
    if (response.success && response.data) {
      return response.data;
    }
    
    console.warn('API call failed, trying to fetch all quotes...');
    
    // Fallback to getting all quotes and selecting random
    const allQuotesResponse = await getQuotes();
    if (allQuotesResponse.success && allQuotesResponse.data && allQuotesResponse.data.length > 0) {
      const randomIndex = Math.floor(Math.random() * allQuotesResponse.data.length);
      return allQuotesResponse.data[randomIndex];
    }
    
    console.warn('Backend API unavailable, using fallback quotes');
    return getRandomMedicalQuoteSync();
    
  } catch (error) {
    console.error('Error fetching medical quote from API:', error);
    return getRandomMedicalQuoteSync();
  }
};

/**
 * Get a random medical quote synchronously from embedded fallback quotes
 * @returns A random quote/fact string
 */
export const getRandomMedicalQuoteSync = (): string => {
  const quotes = getFallbackQuotes();
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex] || 'The art of medicine consists in amusing the patient while nature cures the disease. - Voltaire';
};

/**
 * Fallback quotes in case config.json is not accessible
 * Contains a subset of the most important and inspiring medical quotes
 */
const getFallbackQuotes = (): string[] => {
  return [
    "The art of medicine consists in amusing the patient while nature cures the disease. - Voltaire",
    "Medicine is not only a science; it is also an art. - Paracelsus",
    "The best doctor gives the least medicines. - Benjamin Franklin",
    "Wherever the art of medicine is loved, there is also a love of humanity. - Hippocrates",
    "To cure sometimes, to relieve often, to comfort always. - Edward Livingston Trudeau",
    "The good physician treats the disease; the great physician treats the patient who has the disease. - William Osler",
    "Every patient carries her or his own doctor inside. - Albert Schweitzer",
    "Prevention is better than cure. - Desiderius Erasmus",
    "Laughter is the best medicine. - Proverb",
    "A cheerful heart is good medicine. - Proverbs 17:22",
    
    "Fun Fact: Your heart beats about 100,000 times per day and pumps about 2,000 gallons of blood.",
    "Fun Fact: The human brain contains approximately 86 billion neurons.",
    "Fun Fact: Your body produces about 25 million new cells every second.",
    "Fun Fact: The human eye can distinguish about 10 million colors.",
    "Fun Fact: Your kidneys filter about 50 gallons of blood every day.",
    "Fun Fact: The liver performs over 500 different functions in the body.",
    "Fun Fact: Bone is five times stronger than steel of the same weight.",
    "Fun Fact: The human body contains about 37.2 trillion cells.",
    "Fun Fact: Your brain uses about 20% of your body's total energy.",
    "Fun Fact: The human body is about 60% water in adults.",
    
    "Healthcare Inspiration: Every patient has a story. Listen with your heart as well as your stethoscope.",
    "Healthcare Inspiration: Compassion is the cornerstone of healthcare excellence.",
    "Healthcare Inspiration: In healthcare, small acts of kindness can have profound healing effects.",
    "Healthcare Inspiration: The best healthcare professionals combine clinical excellence with human empathy.",
    "Healthcare Inspiration: Medicine is both a science and an art of caring.",
    "Healthcare Inspiration: Every day in healthcare brings new opportunities to make a difference.",
    "Healthcare Inspiration: Patient safety is everyone's responsibility.",
    "Healthcare Inspiration: Excellence in healthcare is a team effort.",
    "Healthcare Inspiration: The most powerful medicine is a healthcare professional who truly cares.",
    "Healthcare Inspiration: In healthcare, we have the privilege of touching lives at their most vulnerable moments.",
    
    "Health Tip: Wash your hands for at least 20 seconds to prevent infection transmission.",
    "Health Tip: Stay hydrated - aim for 8 glasses of water per day.",
    "Health Tip: Get 7-9 hours of sleep per night for optimal health.",
    "Health Tip: Exercise for at least 30 minutes, 5 days per week.",
    "Health Tip: Eat a variety of colorful fruits and vegetables daily.",
    "Health Tip: Practice stress management through meditation or deep breathing.",
    "Health Tip: Regular health check-ups can catch problems early.",
    "Health Tip: Don't smoke, and limit alcohol consumption.",
    "Health Tip: Maintain good posture to prevent back problems.",
    "Health Tip: Use sunscreen with SPF 30 or higher when outdoors.",
    
    "Medical Milestone: The first successful heart transplant was performed in 1967 by Dr. Christiaan Barnard.",
    "Medical Milestone: Penicillin was discovered by Alexander Fleming in 1928, revolutionizing medicine.",
    "Medical Milestone: X-rays were discovered by Wilhelm Röntgen in 1895.",
    "Medical Milestone: The first vaccine was developed by Edward Jenner for smallpox in 1796.",
    "Medical Milestone: Insulin was first used to treat diabetes in 1922.",
    "Medical Milestone: The structure of DNA was discovered by Watson and Crick in 1953.",
    "Medical Milestone: Anesthesia was first used in surgery in 1846.",
    "Medical Milestone: Antiseptic surgery was pioneered by Joseph Lister in the 1860s.",
    "Medical Milestone: Blood types were discovered by Karl Landsteiner in 1901.",
    "Medical Milestone: The stethoscope was invented by René Laennec in 1816.",
    
    "Emergency Medicine: Time is critical in stroke treatment - think FAST (Face, Arms, Speech, Time).",
    "Emergency Medicine: CPR can double or triple someone's chance of survival.",
    "Emergency Medicine: The first few minutes after cardiac arrest are crucial for survival.",
    "Emergency Medicine: Knowing basic first aid can save lives in emergencies.",
    "Emergency Medicine: Defibrillation within 5 minutes of cardiac arrest improves survival rates.",
    
    "Mental Health Matters: 1 in 4 people will experience a mental health issue at some point.",
    "Mental Health Matters: Exercise releases endorphins that naturally improve mood.",
    "Mental Health Matters: Mental health is just as important as physical health.",
    "Mental Health Matters: Seeking help for mental health issues shows strength, not weakness.",
    "Mental Health Matters: Social connections are crucial for psychological well-being.",
    
    "Did you know? The placebo effect can be so powerful that patients improve even when taking inactive treatments.",
    "Did you know? The human brain cannot feel pain because it has no pain receptors.",
    "Did you know? Laughter really can boost your immune system and reduce stress hormones.",
    "Did you know? Your heart can continue beating even when disconnected from your body.",
    "Did you know? The human body produces its own morphine-like chemicals called endorphins.",
    
    "Anatomy Amazing: The strongest muscle in the human body is the masseter (jaw muscle).",
    "Anatomy Amazing: Your tongue is the only muscle in your body that's attached at only one end.",
    "Anatomy Amazing: The human hand has 27 bones and 29 joints.",
    "Anatomy Amazing: Your ears never stop growing throughout your entire life.",
    "Anatomy Amazing: The human shoulder is the most mobile joint in the body.",
    
    "Final Wisdom: Medicine is both an art and a science that requires lifelong learning.",
    "Final Wisdom: Every healthcare interaction is an opportunity to show compassion.",
    "Final Wisdom: Healthcare professionals make a difference in people's lives every day.",
    "Final Wisdom: Patient-centered care puts the patient at the heart of all decisions.",
    "Final Wisdom: Thank you for your dedication to healing and caring for others."
  ];
};

/**
 * Cache for quotes to avoid repeated API calls
 */
let quotesCache: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached quotes or fetch new ones if cache is expired
 */
export const getCachedQuotes = async (): Promise<string[]> => {
  const now = Date.now();
  
  if (quotesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return quotesCache;
  }
  
  try {
    // Try to fetch from backend API
    const response = await getQuotes();
    if (response.success && response.data && response.data.length > 0) {
      quotesCache = response.data;
      cacheTimestamp = now;
      return quotesCache;
    }
    
    console.warn('Backend API unavailable, using fallback quotes');
  } catch (error) {
    console.warn('Using fallback quotes due to API error:', error);
  }
  
  quotesCache = getFallbackQuotes();
  cacheTimestamp = now;
  return quotesCache;
};