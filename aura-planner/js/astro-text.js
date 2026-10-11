/* Aura — birth chart wording. Plain, reflective language for reflection, not prediction.
   SIGN: the Sun, Moon and Rising sign in full. PLACE: the other planets by sign.
   HOUSE: each of the twelve houses. ASPECT: how two planets relate. */
(function () {
  "use strict";
  var A = window.Aura;

  A.astroText = {
    sun: {
      Aries: "You lead with courage and initiative. Your sense of self comes alive when you start something new and act on it quickly. Growth comes from channelling that energy patiently, not rushing past the people around you.",
      Taurus: "Your identity is steady, sensual and loyal. You find yourself through what you can build, grow and enjoy with your senses. Growth comes from trusting your pace and letting change happen gradually.",
      Gemini: "You express yourself through ideas, conversation and curiosity. You grow by learning widely and sharing what you find. Your challenge is to commit to one path long enough to go deep.",
      Cancer: "You are caring, intuitive and protective of the people you love. Your sense of self is tied to home and belonging. Growth comes from nurturing yourself as generously as you nurture others.",
      Leo: "You shine by being generous, creative and wholeheartedly yourself. You want to be seen for your warmth and talent. Growth comes from giving others the spotlight too, which makes your own light steadier.",
      Virgo: "You find purpose through care, craft and useful service. You notice what needs improving and enjoy making things work well. Growth comes from accepting that good enough is often enough.",
      Libra: "You seek harmony, fairness and beautiful relationships. You understand yourself best through connection with others. Growth comes from making decisions for yourself, not only to keep the peace.",
      Scorpio: "You are intense, perceptive and deeply loyal. You are drawn to truth, transformation and the parts of life others avoid. Growth comes from trusting people enough to let them close.",
      Sagittarius: "You are curious, optimistic and driven by meaning. You grow by exploring new places, ideas and beliefs. Your challenge is to follow through on the big picture with steady, everyday commitment.",
      Capricorn: "You are ambitious, disciplined and built for long-term goals. You earn self-respect through persistence and responsibility. Growth comes from allowing rest and warmth, not only achievement.",
      Aquarius: "You are independent, inventive and committed to the wider good. You think in terms of communities and the future. Growth comes from staying connected to people, not only to ideas.",
      Pisces: "You are imaginative, compassionate and deeply intuitive. You sense what others feel and are moved by beauty and mystery. Growth comes from grounding your dreams in small, practical steps."
    },
    moon: {
      Aries: "You feel things quickly and intensely, and you need to act on strong emotions. Comfort comes from being direct and from having space to move. When hurt, you may react fast and then calm down just as quickly.",
      Taurus: "You feel most secure with routine, comfort and sensory pleasure. Good food, nature and familiar rituals settle you. Change is easier when it comes slowly and with something reliable to hold onto.",
      Gemini: "You process feelings by talking, writing and thinking them through. You need variety and mental stimulation to feel at ease. Comfort comes from good conversation and the sense that you can still explore.",
      Cancer: "You are deeply sensitive and need emotional safety and a sense of home. You absorb the moods of people around you. Comfort comes from nurturing rituals, family ties and time alone to recharge.",
      Leo: "You need warmth, appreciation and room to express your heart. Feeling valued and celebrated restores you. When unseen, you may crave attention, and comfort comes from creative self-expression.",
      Virgo: "You soothe yourself through order, useful tasks and healthy routines. Worry can show up as a need to fix things. Comfort comes from simple, practical care and from being gentle with your inner critic.",
      Libra: "You need harmony, beauty and balanced relationships to feel at ease. Conflict unsettles you deeply. Comfort comes from partnership and from a space that feels calm and well considered.",
      Scorpio: "Your emotions run deep and private, and you feel things with great intensity. You need trust before you open up. Comfort comes from honesty, emotional depth and time to process what you feel.",
      Sagittarius: "You feel most at peace when you have freedom, adventure and a sense of meaning. Restlessness can signal you need new experiences. Comfort comes from optimism, nature and room to explore.",
      Capricorn: "You feel secure when you have structure, achievement and dependable people around you. You may hide feelings behind responsibility. Comfort comes from accepting support and letting yourself rest.",
      Aquarius: "You need independence and room to be yourself to feel emotionally settled. Detached moods can come and go. Comfort comes from friendship, community and freedom from rigid expectations.",
      Pisces: "You feel everything, and your emotions shift like water. Music, art, dreams and compassion restore you. Comfort comes from quiet spaces, gentle boundaries and time that is only yours."
    },
    rising: {
      Aries: "People meet you as direct, energetic and confident. You make a quick, bold first impression. Others may see you as a self-starter, so the challenge is to slow down enough to listen.",
      Taurus: "People see you as calm, grounded and reliable. You make a warm, steady first impression. Others may find you dependable, though you may need to show your flexibility too.",
      Gemini: "People meet you as friendly, witty and curious. You give off an easy, talkative energy. Others may see you as adaptable, so consistency helps people trust what you say.",
      Cancer: "People sense warmth and care in you. You come across as gentle, approachable and protective. Others may not see your strength at first, which you can reveal in time.",
      Leo: "People notice you. You make a confident, warm and expressive first impression. Others may see you as a natural leader, so sharing the stage keeps you genuine.",
      Virgo: "People see you as thoughtful, capable and modest. You make a neat, considered first impression. Others may notice your attention to detail, so kindness to yourself is a useful habit.",
      Libra: "People meet you as charming, polite and easy to be with. You make a graceful first impression. Others may see you as fair-minded, and your challenge is to speak your own view clearly.",
      Scorpio: "People sense depth and intensity in you. You make a magnetic, private first impression. Others may find you hard to read, so letting people in slowly builds real trust.",
      Sagittarius: "People see you as open, enthusiastic and adventurous. You make a friendly, outgoing first impression. Others may find you refreshing, and tact helps your honesty land well.",
      Capricorn: "People see you as serious, capable and reliable. You make a composed, mature first impression. Others may find you hard to get close to at first, so warmth shows your heart.",
      Aquarius: "People meet you as original, independent and friendly from a distance. You make an unusual, thoughtful first impression. Others may see you as detached, so personal warmth helps you connect.",
      Pisces: "People sense sensitivity and kindness in you. You make a soft, dreamy first impression. Others may find you easy to confide in, and clear boundaries help you stay grounded."
    }
  };

  /* placements for the other planets, keyed by planet then sign */
  A.astroPlacement = {
    Mercury: {
      Aries: "You think fast and speak directly. Ideas arrive in bursts, and you say what you mean.",
      Taurus: "You think slowly and carefully, and you trust what you can test. Your words are steady and practical.",
      Gemini: "Your mind is quick, playful and always gathering information. You learn and talk easily.",
      Cancer: "You think through feelings and memories. Your words are caring, and you remember what matters to people.",
      Leo: "You speak with warmth and drama, and you like ideas that feel bold and generous.",
      Virgo: "Your mind is analytical and detail-focused. You notice errors and communicate with precision.",
      Libra: "You weigh both sides before deciding. Your words are diplomatic and aim for fairness.",
      Scorpio: "You think deeply and notice what is hidden. You speak with focus and can be very persuasive.",
      Sagittarius: "You think in big pictures and enjoy philosophy and teaching. Your words are honest and enthusiastic.",
      Capricorn: "You think in structured, long-term terms. You speak with authority and value well-built arguments.",
      Aquarius: "Your mind is original and unconventional. You enjoy unusual ideas and debating the future.",
      Pisces: "You think in images, intuition and feeling. Your words can be poetic, and you listen beneath the surface."
    },
    Venus: {
      Aries: "You fall for passion and directness. In love you want excitement and a partner who keeps up.",
      Taurus: "You value comfort, loyalty and beauty. In love you are affectionate, patient and sensual.",
      Gemini: "You enjoy playful, talkative connection. You need variety and mental chemistry in love.",
      Cancer: "You love with tenderness and loyalty. In love you want emotional safety and a sense of home.",
      Leo: "You love generously and with flair. You want to be adored, and you give warmth freely.",
      Virgo: "You show love through helpful acts and attention to detail. Quiet devotion matters more to you than grand gestures.",
      Libra: "You are drawn to harmony, grace and partnership. You value fairness and romance in equal measure.",
      Scorpio: "You love intensely and loyally. You want depth and honesty, and you give everything once you trust.",
      Sagittarius: "You love freedom, humour and shared adventure. You need a partner who lets you explore.",
      Capricorn: "You value commitment, reliability and lasting partnership. Love grows slowly but holds firm.",
      Aquarius: "You value friendship, independence and shared ideals in love. You need space and originality.",
      Pisces: "You love with compassion and imagination. You are drawn to romance that feels soulful and gentle."
    },
    Mars: {
      Aries: "You have strong drive and courage. You act quickly and feel energised by a challenge.",
      Taurus: "You have steady, determined energy. You act slowly, but you are hard to move once you commit.",
      Gemini: "You act through words, curiosity and many small projects. Your energy is quick and restless.",
      Cancer: "You act to protect people you care about. Your drive is emotional and can be quiet but persistent.",
      Leo: "You act with confidence and pride. You like to lead and to be recognised for your effort.",
      Virgo: "You act with precision and discipline. You work steadily and like tasks that have a clear purpose.",
      Libra: "You act through cooperation. You prefer to negotiate rather than fight, but you can be decisive when needed.",
      Scorpio: "You have intense, focused drive. You act with determination and can hold a grudge if hurt.",
      Sagittarius: "You act with optimism and freedom. You are energised by adventure, and you dislike being held back.",
      Capricorn: "You act with patience and ambition. You build step by step and keep going when others quit.",
      Aquarius: "You act independently and for the group. You may work in bursts and resist being told what to do.",
      Pisces: "You act through intuition and compassion. Your drive can be gentle, but it may need clear direction."
    },
    Jupiter: {
      Aries: "You grow through bold action and new beginnings. Opportunity often comes when you take the first step.",
      Taurus: "You grow through patience, steady work and enjoying what you have. Abundance comes slowly and lasts.",
      Gemini: "You grow through learning, teaching and connecting ideas. Opportunity comes through conversation.",
      Cancer: "You grow through caring for others and building a secure home. Generosity brings good fortune.",
      Leo: "You grow through creativity, generosity and self-expression. Confidence opens doors.",
      Virgo: "You grow through service, skill and improving your craft. Steady effort is rewarded.",
      Libra: "You grow through partnership and fairness. Good relationships bring unexpected support.",
      Scorpio: "You grow through deep change and shared resources. Honest transformation brings lasting gains.",
      Sagittarius: "You grow through travel, learning and belief. Your optimism attracts good fortune.",
      Capricorn: "You grow through responsibility and long-term goals. Achievements build over time.",
      Aquarius: "You grow through community and new ideas. Being part of a group expands what is possible.",
      Pisces: "You grow through compassion, creativity and faith. Trust in the flow of life brings blessings."
    },
    Saturn: {
      Aries: "You learn discipline around action and courage. Patience with your own impulses builds lasting strength.",
      Taurus: "You learn to value security and self-worth. Building things slowly brings lasting reward.",
      Gemini: "You learn discipline around communication and learning. Focus turns scattered ideas into real skill.",
      Cancer: "You learn to set healthy emotional boundaries. Caring for yourself builds lasting security.",
      Leo: "You learn to earn recognition through sincere effort. Confidence grows as you take responsibility.",
      Virgo: "You learn perfectionism and self-discipline. Accepting imperfection gives you room to grow.",
      Libra: "You learn to balance commitments and relationships. Lasting partnership needs clear agreements.",
      Scorpio: "You learn to handle power and vulnerability with care. Trust grows slowly and deeply.",
      Sagittarius: "You learn to build a belief system you can stand by. Commitment turns big dreams into real plans.",
      Capricorn: "You learn ambition, responsibility and endurance. Your achievements tend to last.",
      Aquarius: "You learn to balance independence with obligation. Commitment to your ideals gives them weight.",
      Pisces: "You learn to ground your dreams in structure. Boundaries help your compassion stay sustainable."
    },
    Uranus: {
      Aries: "You bring sudden, original energy to action. Breakthroughs come when you trust your instincts.",
      Taurus: "You bring unusual ideas to money, values and comfort. Change often reshapes what you think is secure.",
      Gemini: "You think in original, unexpected ways. Breakthroughs come through new ideas and connections.",
      Cancer: "You bring unusual approaches to home and emotion. Freedom and belonging need to exist together.",
      Leo: "You express yourself in original, unexpected ways. Self-expression that feels true to you brings change.",
      Virgo: "You bring innovation to work and routines. You may reinvent how things are done.",
      Libra: "You bring fresh ideas to relationships. You value freedom within partnerships.",
      Scorpio: "You bring sudden change to power and intimacy. Transformation often comes unexpectedly.",
      Sagittarius: "You bring original beliefs and a love of freedom. Adventure and new ideas find you.",
      Capricorn: "You bring change to structures and ambitions. You may reshape how success is defined for you.",
      Aquarius: "You are strongly drawn to originality and reform. Community and progress matter to you.",
      Pisces: "You bring imagination and intuition to freedom. Unusual insight can guide you through change."
    },
    Neptune: {
      Aries: "You bring inspiration and idealism to action. Your courage is strongest when it serves a dream.",
      Taurus: "You are drawn to beauty, nature and sensory comfort. Your dreams lean toward the material world.",
      Gemini: "Your imagination flows through ideas and writing. Inspiration arrives in conversation.",
      Cancer: "You are deeply compassionate and imaginative about home and family. Your intuition runs strong.",
      Leo: "You bring romance and imagination to self-expression. Art and performance can move you deeply.",
      Virgo: "You are drawn to service and healing. Your compassion shows in practical, caring work.",
      Libra: "You idealise relationships and beauty. Your sense of harmony is generous and sometimes idealistic.",
      Scorpio: "You feel mystery and emotional depth strongly. Your intuition about hidden truths is powerful.",
      Sagittarius: "You chase visions of meaning and faith. Spiritual journeys and big dreams inspire you.",
      Capricorn: "You blend ambition with a sense of vision. Your dreams can become structured goals.",
      Aquarius: "You are drawn to humanitarian ideals and the future. Your imagination serves the wider world.",
      Pisces: "You are deeply intuitive, compassionate and imaginative. Art, faith and empathy are natural to you."
    }
  };

  /* the twelve houses: the area of life each one describes */
  A.astroHouse = {
    1: "Your identity, body and first impression. This is how you begin and meet the world.",
    2: "Money, possessions and self-worth. What you value and how you build security.",
    3: "Everyday communication, learning, siblings and your immediate surroundings.",
    4: "Home, family roots and your private inner life. Where you feel you belong.",
    5: "Creativity, romance, play and joy. How you express yourself and enjoy life.",
    6: "Daily routines, health, work habits and service. How you care for your body and tasks.",
    7: "Partnerships and close one-to-one relationships. What you seek in others.",
    8: "Shared resources, intimacy and deep transformation. How you handle what is hidden or shared.",
    9: "Travel, beliefs, higher learning and the big picture. Where you look for meaning.",
    10: "Career, public reputation and direction in life. How you are seen by the wider world.",
    11: "Friends, groups, community and hopes for the future. The people who share your goals.",
    12: "Rest, solitude, the subconscious and hidden strengths. Where you recharge in private."
  };

  /* what each planet stands for, used when reading an aspect */
  A.astroKeyword = {
    Sun: "identity and purpose", Moon: "feelings and comfort", Mercury: "thinking and speech",
    Venus: "love, values and enjoyment", Mars: "drive, courage and desire", Jupiter: "growth and opportunity",
    Saturn: "structure, commitment and limits", Uranus: "freedom and change", Neptune: "imagination and compassion"
  };

  /* how each kind of aspect feels */
  A.astroAspect = {
    Conjunction: "The two planets blend into one strong theme. This pairing is hard to separate in how you act.",
    Sextile: "A supportive link. Opportunities appear when you use one planet's gifts to help the other.",
    Square: "A friction that pushes you to act. It can feel tense, but it often drives growth.",
    Trine: "An easy flow. These two energies support each other, though they can also make you complacent.",
    Opposition: "A seesaw between two needs. Balance and awareness help you find a middle path."
  };
})();
