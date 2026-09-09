/**
 * ==========================================================================
 * BHOJPATRA VENDOR REGISTRATION PROTOTYPE V2 — INTERACTION CONTROLLER
 * Source of Truth: Bhojpatra Frontend & Sony's Stakeholder Feedback
 * Principles: Single source of truth, persistent vendor context, separated Live & Extras,
 * Essentials & Cutlery, dynamic Stall builder, food images, unified Review & Submit.
 * ==========================================================================
 */

// ── Application Mock State (Bhojpatra Data Model) ──
const state = {
  // Navigation & Sequence
  currentStepId: 'view-details',
  stepHistory: [],

  // Existing Vendor Account Identity (Reused from Signup / Auth Session - Task 7)
  account: {
    id: "VND-884291",
    name: "Kabir Ahmad",
    email: "vendor@demo-bhojpatra.com",
    phone: "98000 00000",
    role: "vendor",
    verified: true,
  },

  // Selected Service Offerings (Predefined & Custom)
  selectedOfferings: [], // Default unselected: vendor explicitly selects offerings in normal flow

  // Custom Offerings (Task 8: Make Vendor Offerings Customizable)
  customOfferings: [],

  // Commercial Kitchen Identity & Operations (Details not collected at signup)
  details: {
    dietaryOffering: null, // Mandatory selection at start: 'veg' | 'non-veg' | 'both' (no default)
    businessName: "Royal Awadh Caterers",
    ownerName: "Kabir Ahmad",
    phone: "98000 00000",
    email: "vendor@demo-bhojpatra.com",
    city: "Lucknow",
    state: "Uttar Pradesh",
    serviceCities: ["Lucknow", "Kanpur", "Ayodhya", "Varanasi"],
    cuisines: ["Awadhi", "Mughlai", "North Indian"],
    googleRating: "4.8",
    googleReviews: "142",
  },

  // Step 2: Statutory KYC & Compliance
  kyc: {
    gstNumber: "09ABCDE1234F1Z5",
    fssaiNumber: "10000000000000",
    docs: {
      gst: { uploaded: true, filename: "gst_certificate_sample.pdf" },
      fssai: { uploaded: true, filename: "fssai_licence_sample.pdf" },
      ownerId: { uploaded: true, filename: "owner_pan_sample.jpg" },
      businessProof: { uploaded: true, filename: "shop_act_licence_sample.pdf" }
    }
  },

  // Step 5: Catering Builder (5A to 5F)
  catering: {
    // 5A. Package / Feast Basics
    packageName: "Royal Awadh Wedding Feast",
    description: "Heritage multi-course feast slow-cooked on charcoal dum, celebrating centuries of Lucknow's Nawabi culinary art.",
    cuisines: ["Awadhi", "Mughlai"],
    bestFor: ["Weddings", "Receptions", "Engagements"],
    minPax: 50,
    maxPax: 1500,
    leadHours: 48,
    heroImage: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=70",

    // 5B. Platform Standard Courses (data.ts: welcome, starters, main, breads, sweets)
    courses: [
      { id: "welcome", name: "Welcome Drinks", icon: "🥤" },
      { id: "starters", name: "Starters", icon: "🍢" },
      { id: "main", name: "Main Course", icon: "🍲" },
      { id: "breads", name: "Breads", icon: "🫓" },
      { id: "sweets", name: "Sweets & Mithai", icon: "🍬" }
    ],
    activeCourseTab: "starters",

    // 5C. Granular Dishes Catalog with Images & Dietary Badges
    dishes: [
      {
        id: "d1",
        name: "Paneer Tikka Angara",
        course: "starters",
        diet: "veg",
        desc: "Charcoal grilled cottage cheese marinated in spiced hung curd with crushed mint.",
        photo: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=400&q=70",
        tiers: ["Silver", "Gold", "Platinum"],
        isFeatured: true
      },
      {
        id: "d2",
        name: "Galouti Kebab",
        course: "starters",
        diet: "non-veg",
        desc: "Melt-in-mouth smoked lamb patties infused with potli masala, served on saffron mini paratha.",
        photo: "https://images.unsplash.com/photo-1606471191009-63994c53433b?auto=format&fit=crop&w=400&q=70",
        tiers: ["Gold", "Platinum"],
        isFeatured: true
      },
      {
        id: "d3",
        name: "Dahi ke Kebab",
        course: "starters",
        diet: "veg",
        desc: "Crisp hung curd patties with green cardamom, fresh mint, and toasted coriander seeds.",
        photo: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=70",
        tiers: ["Platinum"],
        isFeatured: false
      },
      {
        id: "d4",
        name: "Murg Malai Tikka",
        course: "starters",
        diet: "non-veg",
        desc: "Tender chicken morsels steeped in rich malai cream, cashew paste, and royal white pepper.",
        photo: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=400&q=70",
        tiers: ["Gold", "Platinum"],
        isFeatured: false
      },
      {
        id: "d5",
        name: "Kashmiri Saffron Kahwa",
        course: "welcome",
        diet: "veg",
        desc: "Green tea steeped with saffron strands, whole cinnamon, and slivered almonds.",
        photo: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=70",
        tiers: ["Silver", "Gold", "Platinum"],
        isFeatured: false
      },
      {
        id: "d6",
        name: "Awadhi Dum Biryani",
        course: "main",
        diet: "non-veg",
        desc: "Long-grain aged basmati rice layered with succulent cuts, slow-dum cooked in sealed degchis.",
        photo: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=70",
        tiers: ["Silver", "Gold", "Platinum"],
        isFeatured: true
      },
      {
        id: "d7",
        name: "Dal Makhani Awadh",
        course: "main",
        diet: "veg",
        desc: "Black urad lentils simmered overnight over slow charcoal embers with churned white butter.",
        photo: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=70",
        tiers: ["Silver", "Gold", "Platinum"],
        isFeatured: true
      },
      {
        id: "d8",
        name: "Paneer Lababdar",
        course: "main",
        diet: "veg",
        desc: "Soft cottage cheese in a rich tomato, cream, and grated paneer velvety gravy.",
        photo: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=70",
        tiers: ["Gold", "Platinum"],
        isFeatured: false
      },
      {
        id: "d9",
        name: "Ulte Tawe ka Paratha",
        course: "breads",
        diet: "veg",
        desc: "Delicate saffron-brushed flaky flatbread baked on an inverted copper griddle.",
        photo: "https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=400&q=70",
        tiers: ["Silver", "Gold", "Platinum"],
        isFeatured: false
      },
      {
        id: "d10",
        name: "Shahi Sheermal",
        course: "breads",
        diet: "veg",
        desc: "Traditional sweet saffron-flavoured tandoori flatbread brushed with desi ghee.",
        photo: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=70",
        tiers: ["Gold", "Platinum"],
        isFeatured: false
      },
      {
        id: "d11",
        name: "Shahi Tukda with Rabri",
        course: "sweets",
        diet: "veg",
        desc: "Crisp ghee-fried bread steeped in saffron syrup, topped with thick condensed rabri and pistachios.",
        photo: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=70",
        tiers: ["Silver", "Gold", "Platinum"],
        isFeatured: false
      },
      {
        id: "d12",
        name: "Kesar Pista Kulfi Falooda",
        course: "sweets",
        diet: "veg",
        desc: "Traditional slow-churned malai kulfi served with rose falooda and basil seeds.",
        photo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=70",
        tiers: ["Gold", "Platinum"],
        isFeatured: false
      }
    ],

    // 5D. Pricing & Tiers (Sequential Single-Tier Progression: Silver -> Gold -> Platinum Coming Soon)
    activeTier: "silver",          // Only one tier active at a time: 'silver' | 'gold'
    silverCompleted: false,        // Gold remains locked until Silver is saved
    goldSpecialization: "Awadhi",  // Specialization category for Gold tier
    tierPrices: {
      silver: 799,
      gold: 1199,
      platinum: 1599
    },
    tierQuotas: {
      silver: { welcome: 1, starters: 2, main: 3, breads: 1, sweets: 1 },
      gold: { welcome: 1, starters: 5, main: 5, breads: 2, sweets: 3 },
      platinum: { welcome: 2, starters: 6, main: 6, breads: 2, sweets: 4 }
    },

    // 5E. Live Food & Beverage Counters (Distinct from Extras!)
    liveCounters: ["chaat", "live", "pan"],
    availableCounters: [
      { id: "chaat", name: "Chaat Station", rate: 60, icon: "🥘", desc: "Live Golgappa, Aloo Tikki, Papdi Chaat & Dahi Bhalla" },
      { id: "live", name: "Live Tandoor & Wok", rate: 90, icon: "🍳", desc: "Live rotis, tandoor tikka skewers, and fresh tawa tosses" },
      { id: "pan", name: "Banarasi Paan Counter", rate: 40, icon: "🍃", desc: "Live meetha paan, chocolate paan, silver warq & mukhwas" },
      { id: "pizza", name: "Wood-Fired Pizza", rate: 120, icon: "🍕", desc: "Hand-tossed thin crust artisanal pizzas baked in live oven" },
      { id: "chinese", name: "Chinese Live Wok", rate: 85, icon: "🍜", desc: "Wok-tossed Hakka noodles, Manchurian & spicy Schezwan" },
      { id: "south-indian", name: "Live Dosa Bar", rate: 70, icon: "🥥", desc: "Crisp ghee roast dosas, uttapams & filter coffee" },
      { id: "dessert", name: "Dessert Studio", rate: 70, icon: "🍨", desc: "Live hot jalebi with rabri, malpua & seasonal halwas" },
      { id: "mocktail", name: "Mocktail & Juice Bar", rate: 65, icon: "🍹", desc: "Live fruit punches, mojitos, and fresh botanical coolers" }
    ],

    // 5F. Extras, Essentials & Cutlery (Feast Inclusions)
    cutleryTier: "standard", // 'essential' | 'standard' | 'premium' | 'ultra'
    cutleryTiers: [
      { id: "essential", name: "Package A · Essential Disposables", rate: "Included (₹0)", desc: "Heavy-duty biodegradable areca leaf plates, wooden cutlery & paper cups" },
      { id: "standard", name: "Package B · Standard Tableware", rate: "+₹40/plate", desc: "Ceramic dinner plates, stainless steel cutlery & glassware tumblers" },
      { id: "premium", name: "Package C · Premium Bone China", rate: "+₹90/plate", desc: "Fine bone china crockery, polished stainless cutlery & crystal stemware" },
      { id: "ultra", name: "Package D · Ultra Luxury Gold/Silver", rate: "+₹180/plate", desc: "Imported luxury designer crockery, gold/silver finish cutlery & royal banquet linens" }
    ],
    extras: ["mocktail"],
    availableExtras: [
      { id: "mocktail", name: "Welcome Drinks & Mocktails", rate: "+₹65/p", icon: "🍹", desc: "Live botanical coolers, fresh fruit punches, and spiced mojitos" },
      { id: "hi-tea", name: "Hi-Tea & Evening Snacks", rate: "+₹75/p", icon: "🫖", desc: "Barista tea/coffee bar with hot cocktail samosas and artisanal cookies" },
      { id: "decor", name: "Buffet Floral & Theme Decor", rate: "Flat ₹35,000", icon: "🎉", desc: "Marigold garlands, warm spotlighting, and brass decor props" },
      { id: "sound", name: "Banquet Sound & Announcements", rate: "Flat ₹15,000", icon: "🔊", desc: "Professional wireless PA system, ambient instrumental music, and microphones" }
    ],
    serviceInclusions: {
      staff: true,           // Uniformed stewards & captain
      buffetTables: true,    // Buffet tables & designer linens
      foodLabels: true,      // Acrylic bilingual food labels
      handwashStation: true, // Handwash & sanitization setup
      wasteBins: true,       // Dustbins & clean disposal team
      hygieneCrew: true      // Cleaning & hygiene crew
    }
  },

  // Step 6: Single Stall Builder (6A to 6E) - Truly Dynamic per Sony
  stall: {
    stallName: "Awadhi Dum Biryani & Galouti Corner",
    specialty: "Biryani & Tandoor Station",
    customCategories: [],
    tagline: "Authentic slow-dum Awadhi degchis and live sigdi kebab station cooked on-site.",
    bestFor: ["Weddings", "House Parties", "Corporate Lunches", "Cultural Fairs"],
    menuType: "fixed", // 'fixed' | 'varied'
    fixedPerPlate: 280,
    minPaxGuarantee: 50,
    photo: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=70",
    delicacies: [
      {
        id: "del-1",
        name: "Awadhi Murgh Dum Biryani",
        diet: "non-veg",
        price: 240,
        desc: "Aromatic basmati rice layered with chicken, slow-cooked in sealed clay handis.",
        photo: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=70"
      },
      {
        id: "del-2",
        name: "Shahi Galouti Kebab (2 pcs + Paratha)",
        diet: "non-veg",
        price: 260,
        desc: "Melt-in-mouth smoked lamb patties served with flaky Lucknowi ulte tawe ka paratha.",
        photo: "https://images.unsplash.com/photo-1606471191009-63994c53433b?auto=format&fit=crop&w=400&q=70"
      },
      {
        id: "del-3",
        name: "Paneer Tikka Angara Platter",
        diet: "veg",
        price: 190,
        desc: "Smoky tandoori paneer cubes with chargrilled bell peppers and mint chutney.",
        photo: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=400&q=70"
      },
      {
        id: "del-4",
        name: "Burani Garlic Raita & Sirka Pyaz",
        diet: "veg",
        price: 40,
        desc: "Creamy whipped curd infused with roasted garlic flakes and pickled baby shallots.",
        photo: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=70"
      }
    ],
    liveEquipment: ["Live Sigdi / Charcoal Tandoor", "Inverted Ulta Tawa Griddle", "Buffet Warmers"],
    cutleryOption: "Eco-friendly Areca nut plates, birchwood spoons, and paper napkins included"
  },

  // Step 7: Baina Gifting Box Builder (7A to 7C)
  baina: {
    studioName: "Ram Asrey Royal Baina Studio",
    story: "Heritage Lucknow sweetmakers since 1850, handcrafting artisanal sweet hampers and custom wedding invitation boxes.",
    bestFor: ["Weddings", "Gifting", "Festivals", "Corporate Events"],
    minOrderBoxes: 25,
    leadDays: 3,
    packaging: "velvet", // 'velvet' | 'gold-foil' | 'eco-kraft' | 'brocade'
    boxes: [
      {
        id: "b1",
        name: "Royal Awadhi Celebration Hamper",
        contents: "Kaju Katli, Motichoor Ladoo, Roasted Cashews, Pista Peda",
        priceHalfKg: 550,
        priceOneKg: 950,
        customSizes: [{ label: "250g", price: 300 }, { label: "2kg", price: 1800 }],
        photo: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=70"
      },
      {
        id: "b2",
        name: "Heritage Dry Fruit Invitation Box",
        contents: "Californian Almonds, Kashmiri Walnuts, Afghan Black Raisins, Roasted Pistachios",
        priceHalfKg: 750,
        priceOneKg: 1400,
        customSizes: [{ label: "250g", price: 420 }],
        photo: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=500&q=70"
      }
    ]
  },

  // Feast Capabilities (Step 3 Inclusions: Live Counters, Extras, Add-ons, Essentials)
  capabilities: {
    liveCounters: true,
    extras: true,
    addOns: true,
    essentials: true
  },

  // Active Editing Target for Modals
  activeEditDishId: null,
  activeEditDelicacyId: null,
  activeEditBoxId: null
};

// ── Step Sequencing Definition ──
// Sub-step mapping for clean, focused screens without long scrolling
const STEP_SEQUENCE = [
  'view-details',          // 1. Business Identity & Operations
  'view-kyc',              // 2. Statutory KYC & Verification
  'view-offerings',        // 3. Service Selection (What do you offer?)
  // Dynamic Service Sub-Steps:
  'view-cat-basics',       // 5A. Catering: Package Basics & Best For
  'view-cat-courses',      // 5B. Catering: Course Hierarchy
  'view-cat-dishes',       // 5C. Catering: Dish Builder & Photos
  'view-cat-tiers',        // 5D. Catering: Pricing & Quota Steppers
  'view-cat-live',         // 5E. Catering: Live Counters (Separated!)
  'view-cat-extras',       // 5F. Catering: Extras, Essentials & Cutlery (Separated!)
  'view-stall-basics',     // 6A. Stall: Identity & Specialty
  'view-stall-format',     // 6B. Stall: Menu Format (Fixed vs Varied)
  'view-stall-delicacies', // 6C. Stall: Delicacies Catalog
  'view-stall-pricing',    // 6D. Stall: Pricing & Pax
  'view-stall-live',       // 6E. Stall: Equipment & Cutlery
  'view-baina-basics',     // 7A. Baina: Studio Story & Best For
  'view-baina-boxes',      // 7B. Baina: Box Catalog
  'view-baina-packaging',  // 7C. Baina: Packaging Styles
  'view-review',           // 8. Consolidated Review & Submit
  'view-complete'          // 9. Registration Complete
];

// ── Initial Setup on Window Load ──
function initApp() {
  renderAllViews();
  setupEventListeners();
  goToStep('view-details');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ── Navigation Engine ──
function goToStep(stepId) {
  if (!stepId) return;

  state.stepHistory.push(state.currentStepId);
  state.currentStepId = stepId;

  // Handle Dashboard vs Onboarding Shell Switching
  if (stepId.startsWith('view-dashboard')) {
    const dShell = document.getElementById('desktop-dashboard-shell');
    const oShell = document.getElementById('desktop-onboarding-shell');
    const mDShell = document.getElementById('mobile-dashboard-shell');
    const mOShell = document.getElementById('mobile-onboarding-shell');
    if (dShell) dShell.style.display = 'flex';
    if (oShell) oShell.style.display = 'none';
    if (mDShell) mDShell.style.display = 'flex';
    if (mOShell) mOShell.style.display = 'none';

    renderDashboardView();

    let tab = 'home';
    if (stepId === 'view-dashboard-services') tab = 'services';
    if (stepId === 'view-dashboard-orders') tab = 'orders';
    setDashboardTab(tab, false);

    const jumpSelect = document.getElementById('prototype-step-jump');
    if (jumpSelect) jumpSelect.value = stepId;

    const quickBtn = document.getElementById('btn-quick-dash-toggle');
    if (quickBtn) {
      quickBtn.classList.add('active');
      quickBtn.innerHTML = '<span>📝</span> Back to Onboarding';
    }
    return;
  } else {
    const dShell = document.getElementById('desktop-dashboard-shell');
    const oShell = document.getElementById('desktop-onboarding-shell');
    const mDShell = document.getElementById('mobile-dashboard-shell');
    const mOShell = document.getElementById('mobile-onboarding-shell');
    if (dShell) dShell.style.display = 'none';
    if (oShell) oShell.style.display = 'flex';
    if (mDShell) mDShell.style.display = 'none';
    if (mOShell) mOShell.style.display = 'flex';

    const quickBtn = document.getElementById('btn-quick-dash-toggle');
    if (quickBtn) {
      quickBtn.classList.remove('active');
      quickBtn.innerHTML = '<span>📊</span> Vendor Dashboard';
    }
  }

  // Toggle active containers across both Desktop and Mobile frames
  document.querySelectorAll('.step-container').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-step-id') === stepId);
  });

  // Update Top Prototyping Dropdown
  const jumpSelect = document.getElementById('prototype-step-jump');
  if (jumpSelect) jumpSelect.value = stepId;

  // Render Persistent Context Header
  updateVendorContextHeader();

  // Update High-Level Stepper Progress
  updateStepperProgress(stepId);

  // Update Subnav Breadcrumb
  updateSubnavBreadcrumbs(stepId);

  // Re-render dynamic step views if necessary
  if (stepId === 'view-cat-dishes') renderDishList();
  if (stepId === 'view-cat-tiers') { renderTierView(); }
  if (stepId === 'view-stall-delicacies') renderDelicaciesList();
  if (stepId === 'view-baina-boxes') renderBainaBoxList();
  if (stepId === 'view-review') renderMasterReview();
  renderPhase3StateToUI();

  // Scroll active frame body to top
  document.querySelectorAll('.wizard-body').forEach(b => b.scrollTop = 0);
}

function nextStep() {
  const cur = state.currentStepId;

  // Step 1: Details -> KYC (Mandatory Diet Selection Gate)
  if (cur === 'view-details') {
    if (!state.details.dietaryOffering) {
      document.querySelectorAll('.diet-validation-error').forEach(el => el.style.display = 'block');
      document.querySelectorAll('.diet-selection-section').forEach(el => el.classList.add('pulse-error'));
      showToast("Please select your kitchen's dietary offering (Veg, Non-Veg, or Both) to continue.");
      return;
    }
    goToStep('view-kyc');
    return;
  }

  // Step 2: KYC -> Offerings
  if (cur === 'view-kyc') {
    goToStep('view-offerings');
    return;
  }

  // Step 3: Offerings -> First Selected Service
  if (cur === 'view-offerings') {
    routeAfterOfferings();
    return;
  }

  // Inside Catering (Feast Booking) Flow:
  if (cur === 'view-cat-basics') { goToStep('view-cat-courses'); return; }
  if (cur === 'view-cat-courses') { goToStep('view-cat-dishes'); return; }
  if (cur === 'view-cat-dishes') { goToStep('view-cat-tiers'); return; }
  if (cur === 'view-cat-tiers') {
    if (state.selectedOfferings.includes('counters')) {
      goToStep('view-cat-live');
    } else if (state.selectedOfferings.includes('extras') || state.selectedOfferings.includes('addons') || state.selectedOfferings.includes('essentials')) {
      goToStep('view-cat-extras');
    } else if (state.selectedOfferings.includes('stall')) {
      goToStep('view-stall-basics');
    } else if (state.selectedOfferings.includes('baina')) {
      goToStep('view-baina-basics');
    } else {
      goToStep('view-review');
    }
    return;
  }

  // Inside Live Counters Flow:
  if (cur === 'view-cat-live') {
    if (state.selectedOfferings.includes('extras') || state.selectedOfferings.includes('addons') || state.selectedOfferings.includes('essentials')) {
      goToStep('view-cat-extras');
    } else if (state.selectedOfferings.includes('stall')) {
      goToStep('view-stall-basics');
    } else if (state.selectedOfferings.includes('baina')) {
      goToStep('view-baina-basics');
    } else {
      goToStep('view-review');
    }
    return;
  }

  // Inside Extras & Essentials Flow:
  if (cur === 'view-cat-extras') {
    if (state.selectedOfferings.includes('stall')) {
      goToStep('view-stall-basics');
    } else if (state.selectedOfferings.includes('baina')) {
      goToStep('view-baina-basics');
    } else {
      goToStep('view-review');
    }
    return;
  }

  // Inside Stall Flow:
  if (cur === 'view-stall-basics') { goToStep('view-stall-format'); return; }
  if (cur === 'view-stall-format') { goToStep('view-stall-delicacies'); return; }
  if (cur === 'view-stall-delicacies') { goToStep('view-stall-pricing'); return; }
  if (cur === 'view-stall-pricing') { goToStep('view-stall-live'); return; }
  if (cur === 'view-stall-live') {
    if (state.selectedOfferings.includes('baina')) {
      goToStep('view-baina-basics');
    } else {
      goToStep('view-review');
    }
    return;
  }

  // Inside Baina Flow:
  if (cur === 'view-baina-basics') { goToStep('view-baina-boxes'); return; }
  if (cur === 'view-baina-boxes') { goToStep('view-baina-packaging'); return; }
  if (cur === 'view-baina-packaging') {
    goToStep('view-review');
    return;
  }

  // Review -> Complete
  if (cur === 'view-review') {
    goToStep('view-complete');
    return;
  }
}

function prevStep() {
  const cur = state.currentStepId;

  if (cur === 'view-kyc') { goToStep('view-details'); return; }
  if (cur === 'view-offerings') { goToStep('view-kyc'); return; }

  // From Catering (Feast Booking):
  if (cur === 'view-cat-basics') { goToStep('view-offerings'); return; }
  if (cur === 'view-cat-courses') { goToStep('view-cat-basics'); return; }
  if (cur === 'view-cat-dishes') { goToStep('view-cat-courses'); return; }
  if (cur === 'view-cat-tiers') { goToStep('view-cat-dishes'); return; }

  // From Live Counters:
  if (cur === 'view-cat-live') {
    if (state.selectedOfferings.includes('catering')) {
      goToStep('view-cat-tiers');
    } else {
      goToStep('view-offerings');
    }
    return;
  }

  // From Extras & Essentials:
  if (cur === 'view-cat-extras') {
    if (state.selectedOfferings.includes('counters')) {
      goToStep('view-cat-live');
    } else if (state.selectedOfferings.includes('catering')) {
      goToStep('view-cat-tiers');
    } else {
      goToStep('view-offerings');
    }
    return;
  }

  // From Stall:
  if (cur === 'view-stall-basics') {
    if (state.selectedOfferings.includes('extras') || state.selectedOfferings.includes('addons') || state.selectedOfferings.includes('essentials')) {
      goToStep('view-cat-extras');
    } else if (state.selectedOfferings.includes('counters')) {
      goToStep('view-cat-live');
    } else if (state.selectedOfferings.includes('catering')) {
      goToStep('view-cat-tiers');
    } else {
      goToStep('view-offerings');
    }
    return;
  }
  if (cur === 'view-stall-format') { goToStep('view-stall-basics'); return; }
  if (cur === 'view-stall-delicacies') { goToStep('view-stall-format'); return; }
  if (cur === 'view-stall-pricing') { goToStep('view-stall-delicacies'); return; }
  if (cur === 'view-stall-live') { goToStep('view-stall-pricing'); return; }

  // From Baina:
  if (cur === 'view-baina-basics') {
    if (state.selectedOfferings.includes('stall')) {
      goToStep('view-stall-live');
    } else if (state.selectedOfferings.includes('extras') || state.selectedOfferings.includes('addons') || state.selectedOfferings.includes('essentials')) {
      goToStep('view-cat-extras');
    } else if (state.selectedOfferings.includes('counters')) {
      goToStep('view-cat-live');
    } else if (state.selectedOfferings.includes('catering')) {
      goToStep('view-cat-tiers');
    } else {
      goToStep('view-offerings');
    }
    return;
  }
  if (cur === 'view-baina-boxes') { goToStep('view-baina-basics'); return; }
  if (cur === 'view-baina-packaging') { goToStep('view-baina-boxes'); return; }

  // From Review:
  if (cur === 'view-review') {
    if (state.selectedOfferings.includes('baina')) {
      goToStep('view-baina-packaging');
    } else if (state.selectedOfferings.includes('stall')) {
      goToStep('view-stall-live');
    } else if (state.selectedOfferings.includes('extras') || state.selectedOfferings.includes('addons') || state.selectedOfferings.includes('essentials')) {
      goToStep('view-cat-extras');
    } else if (state.selectedOfferings.includes('counters')) {
      goToStep('view-cat-live');
    } else if (state.selectedOfferings.includes('catering')) {
      goToStep('view-cat-tiers');
    } else {
      goToStep('view-offerings');
    }
    return;
  }

  if (cur === 'view-complete') {
    goToStep('view-review');
    return;
  }
}

function routeAfterOfferings() {
  if (state.selectedOfferings.length === 0) {
    showToast("Please select at least one service offering to proceed.");
    return;
  }
  if (state.selectedOfferings.includes('catering')) {
    goToStep('view-cat-basics');
  } else if (state.selectedOfferings.includes('counters')) {
    goToStep('view-cat-live');
  } else if (state.selectedOfferings.includes('extras') || state.selectedOfferings.includes('addons') || state.selectedOfferings.includes('essentials')) {
    goToStep('view-cat-extras');
  } else if (state.selectedOfferings.includes('stall')) {
    goToStep('view-stall-basics');
  } else if (state.selectedOfferings.includes('baina')) {
    goToStep('view-baina-basics');
  } else {
    goToStep('view-review');
  }
}

// ── Persistent Vendor Context Header (Sony's Core Requirement) ──
function updateVendorContextHeader() {
  const isAfterStep1 = state.currentStepId !== 'view-details';
  const headers = document.querySelectorAll('.vendor-context-header');

  headers.forEach(h => {
    h.style.display = isAfterStep1 ? 'flex' : 'none';

    // Populate Vendor details
    const nameEl = h.querySelector('.vendor-context-biz-name');
    if (nameEl) nameEl.textContent = state.details.businessName || "Vendor Partner";

    const cityEl = h.querySelector('.vendor-context-city-badge');
    if (cityEl) cityEl.textContent = `${state.details.city}, ${state.details.state || "UP"}`;

    const ratingEl = h.querySelector('.vendor-context-rating-badge');
    if (ratingEl) ratingEl.innerHTML = `<span class="star">★</span> ${state.details.googleRating} (${state.details.googleReviews} reviews)`;

    // Services Pills & Dietary Offering (Plain Text, Zero Badges)
    const servicesRow = h.querySelector('.vendor-context-services');
    if (servicesRow) {
      const labelMap = {
        'catering': 'Feast Booking',
        'stall': 'Stall',
        'baina': 'Baina Boxes',
        'counters': 'Live Counters',
        'extras': 'Extras',
        'addons': 'Add-ons',
        'essentials': 'Essentials'
      };
      let pillsHtml = state.selectedOfferings.map(s => {
        let label = labelMap[s];
        if (!label && state.customOfferings) {
          const custom = state.customOfferings.find(c => c.id === s);
          if (custom) label = custom.title;
        }
        return `<span class="service-pill">${label || s}</span>`;
      }).join('');

      if (state.details.dietaryOffering) {
        const dietNames = { 'veg': 'Pure Veg', 'non-veg': 'Non-Veg Only', 'both': 'Both Veg & Non-Veg' };
        pillsHtml += `<span class="service-pill" style="border-color:var(--color-black-40);color:var(--color-black);font-weight:700;">${dietNames[state.details.dietaryOffering] || state.details.dietaryOffering}</span>`;
      }
      servicesRow.innerHTML = pillsHtml;
    }

    // Active Focus Tag
    const tagEl = h.querySelector('.active-builder-tag');
    if (tagEl) {
      let focusText = "Onboarding";
      if (['view-cat-basics', 'view-cat-courses', 'view-cat-dishes', 'view-cat-tiers'].includes(state.currentStepId)) focusText = "Feast Builder";
      else if (state.currentStepId === 'view-cat-live') focusText = "Live Counters";
      else if (state.currentStepId === 'view-cat-extras') focusText = "Extras & Essentials";
      else if (state.currentStepId.startsWith('view-stall-')) focusText = "Stall Builder";
      else if (state.currentStepId.startsWith('view-baina-')) focusText = "Baina Builder";
      else if (state.currentStepId === 'view-review') focusText = "Final Review";
      tagEl.textContent = focusText;
    }
  });
}

// ── Stepper Bar Progress Engine (Phase 1: Without Step Numbers) ──
function updateStepperProgress(stepId) {
  const phases = [
    { id: 'phase-identity', label: 'Identity', steps: ['view-details'] },
    { id: 'phase-kyc', label: 'KYC', steps: ['view-kyc'] },
    { id: 'phase-offerings', label: 'Offerings', steps: ['view-offerings'] },
    { id: 'phase-builder', label: 'Service Setup', steps: [
      'view-cat-basics', 'view-cat-courses', 'view-cat-dishes', 'view-cat-tiers', 'view-cat-live', 'view-cat-extras',
      'view-stall-basics', 'view-stall-format', 'view-stall-delicacies', 'view-stall-pricing', 'view-stall-live',
      'view-baina-basics', 'view-baina-boxes', 'view-baina-packaging'
    ]},
    { id: 'phase-review', label: 'Review & Submit', steps: ['view-review'] },
    { id: 'phase-complete', label: 'Go Live', steps: ['view-complete'] }
  ];

  let currentPhaseIndex = 0;
  for (let i = 0; i < phases.length; i++) {
    if (phases[i].steps.includes(stepId)) {
      currentPhaseIndex = i;
      break;
    }
  }

  ['desktop-stepper-track', 'mobile-stepper-track'].forEach(trackId => {
    const track = document.getElementById(trackId);
    if (!track) return;

    let html = '';
    phases.forEach((p, idx) => {
      const isActive = idx === currentPhaseIndex;
      const isCompleted = idx < currentPhaseIndex;
      const statusClass = isActive ? 'active' : isCompleted ? 'completed' : '';

      html += `
        <div class="step-node ${statusClass}" onclick="jumpToPhase(${idx})">
          <div class="step-bullet">${isCompleted ? '✓' : '•'}</div>
          <span>${p.label}</span>
        </div>
      `;
      if (idx < phases.length - 1) {
        html += `<div class="stepper-line ${isCompleted ? 'completed' : ''}"></div>`;
      }
    });
    track.innerHTML = html;
  });
}

function jumpToPhase(phaseIndex) {
  const targetMap = [
    'view-details',
    'view-kyc',
    'view-offerings',
    state.selectedOfferings.includes('catering') ? 'view-cat-basics' : state.selectedOfferings.includes('stall') ? 'view-stall-basics' : 'view-baina-basics',
    'view-review',
    'view-complete'
  ];
  if (targetMap[phaseIndex]) goToStep(targetMap[phaseIndex]);
}

// ── Builder Subnav Breadcrumb Engine ──
function updateSubnavBreadcrumbs(stepId) {
  const subnavs = document.querySelectorAll('.builder-subnav-bar');
  subnavs.forEach(bar => {
    const group = bar.getAttribute('data-subnav-group');
    const isVisible = (group === 'catering' && stepId.startsWith('view-cat-')) ||
                      (group === 'stall' && stepId.startsWith('view-stall-')) ||
                      (group === 'baina' && stepId.startsWith('view-baina-'));

    bar.style.display = isVisible ? 'flex' : 'none';

    if (isVisible) {
      bar.querySelectorAll('.subnav-pill').forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-target-step') === stepId);
      });
    }
  });
}

// ── Step 4: Service Offering Toggle ──
function toggleOffering(offeringKey) {
  const idx = state.selectedOfferings.indexOf(offeringKey);
  if (idx > -1) {
    state.selectedOfferings.splice(idx, 1);
  } else {
    state.selectedOfferings.push(offeringKey);
  }

  // Update UI selection cards
  document.querySelectorAll('.offering-card').forEach(c => {
    const key = c.getAttribute('data-offering-key');
    const isSelected = state.selectedOfferings.includes(key);
    c.classList.toggle('active', isSelected);
    const box = c.querySelector('.offering-checkbox');
    if (box) box.textContent = isSelected ? '✓' : '';
  });

  updateVendorContextHeader();
}

// ── Step 5: Catering Builder Interactions ──
function setCourseTab(courseId) {
  state.catering.activeCourseTab = courseId;
  document.querySelectorAll('.course-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-course-id') === courseId);
  });
  renderDishList();
}

function renderDishList() {
  const activeCourse = state.catering.activeCourseTab;
  const filteredDishes = state.catering.dishes.filter(d => d.course === activeCourse);

  const containers = document.querySelectorAll('.dishes-catalog-container');
  containers.forEach(c => {
    if (filteredDishes.length === 0) {
      c.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--color-black-60); font-size: 13px;">
          No dishes added to this course yet. Click below to add your first delicacy!
        </div>
      `;
      return;
    }

    c.innerHTML = filteredDishes.map(d => `
      <div class="dish-card" id="dish-row-${d.id}">
        <div class="dish-card-left">
          <img src="${d.photo}" alt="${d.name}" class="dish-thumb" onerror="this.src='https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=70'" />
          <div class="dish-info">
            <div class="dish-name-row">
              <span class="fssai-icon ${d.diet}" title="${d.diet === 'veg' ? '100% Vegetarian' : 'Non-Vegetarian'}"></span>
              <span class="dish-name">${d.name}</span>
              ${d.isFeatured ? '<span class="service-pill" style="background:var(--color-cream);color:var(--color-red);">★ Signature</span>' : ''}
            </div>
            <p class="dish-desc">${d.desc}</p>
            <div class="dish-meta-row">
              ${d.tiers.map(t => `<span class="dish-tier-tag ${t.toLowerCase()}">${t}</span>`).join('')}
            </div>
          </div>
        </div>
        <div class="dish-card-actions">
          <button type="button" class="btn-icon-action" onclick="openDishEditor('${d.id}')" title="Edit Dish">✎</button>
          <button type="button" class="btn-icon-action" onclick="deleteDish('${d.id}')" title="Remove Dish">✕</button>
        </div>
      </div>
    `).join('');
  });

  // Update Dish counts on tabs
  updateCourseBadgeCounts();
}

function updateCourseBadgeCounts() {
  state.catering.courses.forEach(cat => {
    const count = state.catering.dishes.filter(d => d.course === cat.id).length;
    document.querySelectorAll(`.tab-badge[data-course-count="${cat.id}"]`).forEach(el => {
      el.textContent = count;
    });
  });
}

function openDishEditor(dishId) {
  state.activeEditDishId = dishId;
  const modal = document.getElementById('modal-dish-editor');
  if (!modal) return;

  if (dishId) {
    const dish = state.catering.dishes.find(d => d.id === dishId);
    if (dish) {
      document.getElementById('dish-input-name').value = dish.name;
      document.getElementById('dish-input-diet').value = dish.diet;
      document.getElementById('dish-input-course').value = dish.course;
      document.getElementById('dish-input-desc').value = dish.desc;
      document.getElementById('dish-input-photo').value = dish.photo;
      document.getElementById('dish-tier-silver').checked = dish.tiers.includes('Silver');
      document.getElementById('dish-tier-gold').checked = dish.tiers.includes('Gold');
      document.getElementById('dish-tier-platinum').checked = dish.tiers.includes('Platinum');
    }
  } else {
    // New Dish Defaults
    document.getElementById('dish-input-name').value = '';
    document.getElementById('dish-input-diet').value = 'veg';
    document.getElementById('dish-input-course').value = state.catering.activeCourseTab;
    document.getElementById('dish-input-desc').value = '';
    document.getElementById('dish-input-photo').value = 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=400&q=70';
    document.getElementById('dish-tier-silver').checked = true;
    document.getElementById('dish-tier-gold').checked = true;
    document.getElementById('dish-tier-platinum').checked = true;
  }

  modal.classList.add('open');
}

function closeDishEditor() {
  const modal = document.getElementById('modal-dish-editor');
  if (modal) modal.classList.remove('open');
  state.activeEditDishId = null;
}

function saveDishEditor() {
  const name = document.getElementById('dish-input-name').value.trim();
  if (!name) {
    showToast("Please enter a dish name.");
    return;
  }

  const diet = document.getElementById('dish-input-diet').value;
  const course = document.getElementById('dish-input-course').value;
  const desc = document.getElementById('dish-input-desc').value.trim();
  const photo = document.getElementById('dish-input-photo').value.trim() || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=70';

  const tiers = [];
  if (document.getElementById('dish-tier-silver').checked) tiers.push('Silver');
  if (document.getElementById('dish-tier-gold').checked) tiers.push('Gold');
  if (document.getElementById('dish-tier-platinum').checked) tiers.push('Platinum');

  if (tiers.length === 0) {
    showToast("Please assign the dish to at least one tier (Silver, Gold, or Platinum).");
    return;
  }

  if (state.activeEditDishId) {
    const dish = state.catering.dishes.find(d => d.id === state.activeEditDishId);
    if (dish) {
      dish.name = name;
      dish.diet = diet;
      dish.course = course;
      dish.desc = desc;
      dish.photo = photo;
      dish.tiers = tiers;
    }
    showToast(`Updated "${name}"`);
  } else {
    const newDish = {
      id: `d-${Date.now()}`,
      name,
      diet,
      course,
      desc,
      photo,
      tiers,
      isFeatured: false
    };
    state.catering.dishes.push(newDish);
    showToast(`Added "${name}" to menu`);
  }

  closeDishEditor();
  renderDishList();
}

function deleteDish(dishId) {
  state.catering.dishes = state.catering.dishes.filter(d => d.id !== dishId);
  renderDishList();
  showToast("Dish removed from menu.");
}

// ── Step 1: Dietary Classification Handler (Mandatory at Start) ──
function setDietaryOffering(val) {
  state.details.dietaryOffering = val;
  document.querySelectorAll('.diet-choice-card').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-diet-value') === val);
  });
  document.querySelectorAll('.diet-validation-error').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.diet-selection-section').forEach(el => el.classList.remove('pulse-error'));
  updateVendorContextHeader();
}

// ── Step 3: Feast Capabilities Inclusions Toggle ──
function toggleCapability(capKey, isChecked) {
  state.capabilities[capKey] = isChecked;
  document.querySelectorAll(`input[data-cap="${capKey}"]`).forEach(cb => {
    cb.checked = isChecked;
  });
}

// ── Step 5D: Sequential Single-Tier Onboarding & Specialization Handlers ──
function switchTierView(tier) {
  if (tier === 'platinum') {
    showToast("Platinum tier onboarding is coming soon.");
    return;
  }
  if (tier === 'gold' && !state.catering.silverCompleted) {
    showToast("Please configure and save Silver tier first.");
    return;
  }
  state.catering.activeTier = tier;
  renderTierView();
}

function saveSilverTier() {
  state.catering.silverCompleted = true;
  state.catering.activeTier = 'gold';
  renderTierView();
  showToast("Silver tier saved! Now configure Gold tier.");
}

function backToSilverTier() {
  // Silver remains completed, Gold remains unlocked, data preserved
  state.catering.activeTier = 'silver';
  renderTierView();
}

function saveGoldTier() {
  showToast("Gold tier saved!");
  nextStep();
}

function setGoldSpecialization(val) {
  if (val === '__custom__') {
    openCustomSpecializationInput();
    return;
  }
  state.catering.goldSpecialization = val;
  document.querySelectorAll('[data-bind="catering.goldSpecialization"]').forEach(el => {
    el.value = val;
  });
}

function openCustomSpecializationInput() {
  document.querySelectorAll('.custom-spec-wrapper').forEach(w => w.style.display = 'block');
  document.querySelectorAll('.spec-footer-action').forEach(fa => fa.style.display = 'none');
  const inputs = document.querySelectorAll('.custom-spec-input');
  inputs.forEach(inp => inp.value = '');
  if (inputs.length > 0) {
    inputs[0].focus();
  }
}

function cancelCustomSpecialization() {
  document.querySelectorAll('.custom-spec-wrapper').forEach(w => w.style.display = 'none');
  document.querySelectorAll('.spec-footer-action').forEach(fa => fa.style.display = 'flex');
  document.querySelectorAll('[data-bind="catering.goldSpecialization"]').forEach(el => {
    if (el.value === '__custom__') {
      el.value = state.catering.goldSpecialization || 'Awadhi';
    }
  });
}

function addCustomSpecialization(name) {
  const cleanName = (name || '').trim();
  if (!cleanName) {
    showToast("Please enter a culinary specialization name.");
    return;
  }

  document.querySelectorAll('[data-bind="catering.goldSpecialization"]').forEach(selectEl => {
    let exists = false;
    for (let opt of selectEl.options) {
      if (opt.value.toLowerCase() === cleanName.toLowerCase()) {
        opt.selected = true;
        exists = true;
        break;
      }
    }
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = cleanName;
      opt.textContent = `${cleanName} (Custom Specialization)`;
      opt.selected = true;

      const customOpt = selectEl.querySelector('option[value="__custom__"]');
      if (customOpt) {
        selectEl.insertBefore(opt, customOpt);
      } else {
        selectEl.appendChild(opt);
      }
    }
    selectEl.value = cleanName;
  });

  state.catering.goldSpecialization = cleanName;
  document.querySelectorAll('.custom-spec-input').forEach(inp => inp.value = '');
  cancelCustomSpecialization();
  showToast(`Added "${cleanName}" to culinary specializations!`);
}

function addCustomSpecializationFromInput(btnOrInput) {
  const container = btnOrInput.closest('.custom-spec-wrapper');
  const input = container ? container.querySelector('.custom-spec-input') : document.querySelector('.custom-spec-input');
  if (input) {
    addCustomSpecialization(input.value);
  }
}

function renderTierView() {
  const active = state.catering.activeTier || 'silver';
  const silverDone = state.catering.silverCompleted;

  // Progression tabs update
  document.querySelectorAll('.tier-prog-tab[data-tier="silver"]').forEach(tab => {
    tab.classList.toggle('active', active === 'silver');
    tab.classList.toggle('completed', silverDone);
    const statusEl = tab.querySelector('.tab-status');
    if (statusEl) statusEl.textContent = silverDone ? '✓ Completed' : 'In Progress';
  });

  document.querySelectorAll('.tier-prog-tab[data-tier="gold"]').forEach(tab => {
    tab.classList.toggle('active', active === 'gold');
    tab.classList.toggle('locked', !silverDone);
    const statusEl = tab.querySelector('.tab-status');
    if (statusEl) statusEl.textContent = silverDone ? (active === 'gold' ? 'In Progress' : 'Configured') : '🔒 Locked';
  });

  // Toggle single active panel across both Desktop and Mobile
  document.querySelectorAll('.tier-panel-silver').forEach(p => {
    p.classList.toggle('active', active === 'silver');
    p.style.display = active === 'silver' ? 'block' : 'none';
  });
  document.querySelectorAll('.tier-panel-gold').forEach(p => {
    p.classList.toggle('active', active === 'gold');
    p.style.display = active === 'gold' ? 'block' : 'none';
  });

  // Sync specialization select
  document.querySelectorAll('[data-bind="catering.goldSpecialization"]').forEach(el => {
    const val = state.catering.goldSpecialization || 'Awadhi';
    let exists = false;
    for (let opt of el.options) {
      if (opt.value === val) { exists = true; break; }
    }
    if (!exists && val && val !== '__custom__') {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = `${val} (Custom Specialization)`;
      const customOpt = el.querySelector('option[value="__custom__"]');
      if (customOpt) el.insertBefore(opt, customOpt);
      else el.appendChild(opt);
    }
    el.value = val;
  });

  renderTierQuotas();
}

// ── Quota Steppers ──
function adjustQuota(tier, courseKey, delta) {
  const current = state.catering.tierQuotas[tier][courseKey] || 0;
  const updated = Math.max(0, current + delta);
  state.catering.tierQuotas[tier][courseKey] = updated;

  document.querySelectorAll(`.stepper-val[data-tier="${tier}"][data-course="${courseKey}"]`).forEach(el => {
    el.textContent = updated;
  });
}

function renderTierQuotas() {
  ['silver', 'gold', 'platinum'].forEach(tier => {
    Object.keys(state.catering.tierQuotas[tier]).forEach(courseKey => {
      const val = state.catering.tierQuotas[tier][courseKey];
      document.querySelectorAll(`.stepper-val[data-tier="${tier}"][data-course="${courseKey}"]`).forEach(el => {
        el.textContent = val;
      });
    });
  });
}

// ── Step 5E: Live Food Counters Selection (Separated from Extras) ──
function toggleLiveCounter(counterId) {
  const idx = state.catering.liveCounters.indexOf(counterId);
  if (idx > -1) {
    state.catering.liveCounters.splice(idx, 1);
  } else {
    state.catering.liveCounters.push(counterId);
  }

  document.querySelectorAll(`.counter-item-card[data-counter-id="${counterId}"]`).forEach(c => {
    c.classList.toggle('active', state.catering.liveCounters.includes(counterId));
  });
}

// ── Step 5F: Cutlery & Tableware Tiers (Add-ons - Task 16) ──
function setCutleryTier(tierId) {
  state.catering.cutleryTier = tierId;
  document.querySelectorAll('.cutlery-tier-card').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-cutlery-id') === tierId);
  });
}

// ── Step 5F: Feast Hospitality Extras (Task 14) ──
function toggleFeastExtra(extraId) {
  if (!state.catering.extras) state.catering.extras = [];
  const idx = state.catering.extras.indexOf(extraId);
  if (idx > -1) {
    state.catering.extras.splice(idx, 1);
  } else {
    state.catering.extras.push(extraId);
  }
  document.querySelectorAll(`.feast-extra-card[data-extra-id="${extraId}"]`).forEach(card => {
    card.classList.toggle('active', state.catering.extras.includes(extraId));
  });
}

// ── Step 5F: Essential Service Inclusions (Task 15) ──
function toggleFeastEssential(key) {
  if (!state.catering.serviceInclusions) state.catering.serviceInclusions = {};
  const nextVal = !state.catering.serviceInclusions[key];
  state.catering.serviceInclusions[key] = nextVal;
  document.querySelectorAll(`.choice-chip[data-essential-key="${key}"]`).forEach(chip => {
    setChipState(chip, nextVal);
  });
}

// ── Step 6A: Stall Identity - New Category Creation (Task 12) ──
function toggleNewCategoryBox(source = 'desktop') {
  const boxId = source === 'mobile' ? 'mobile-new-cat-box' : 'desktop-new-cat-box';
  const inputId = source === 'mobile' ? 'mobile-new-cat-input' : 'desktop-new-cat-input';
  const box = document.getElementById(boxId);
  if (!box) return;
  const isHidden = box.style.display === 'none' || !box.style.display;
  box.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) {
    const input = document.getElementById(inputId);
    if (input) input.focus();
  }
}

function submitNewStallCategory(source = 'desktop') {
  const inputId = source === 'mobile' ? 'mobile-new-cat-input' : 'desktop-new-cat-input';
  const input = document.getElementById(inputId);
  if (!input || !input.value.trim()) {
    showToast('Please enter a category name');
    return;
  }

  const catName = input.value.trim();
  if (!state.stall.customCategories) state.stall.customCategories = [];

  // Prevent accidental duplicates (case-insensitive check against options)
  const existingOption = Array.from(document.querySelectorAll('.stall-specialty-select option'))
    .find(opt => opt.value.toLowerCase() === catName.toLowerCase() || opt.textContent.toLowerCase() === catName.toLowerCase());

  if (existingOption) {
    state.stall.specialty = existingOption.value;
    document.querySelectorAll('.stall-specialty-select').forEach(sel => {
      sel.value = existingOption.value;
    });
    toggleNewCategoryBox(source);
    input.value = '';
    showToast(`Selected existing category "${existingOption.value}"`);
    return;
  }

  // Register and set custom category (strictly isolated from commercial offerings)
  if (!state.stall.customCategories.includes(catName)) {
    state.stall.customCategories.push(catName);
  }
  state.stall.specialty = catName;

  document.querySelectorAll('.stall-specialty-select').forEach(sel => {
    const opt = document.createElement('option');
    opt.value = catName;
    opt.textContent = catName;
    sel.appendChild(opt);
    sel.value = catName;
  });

  input.value = '';
  toggleNewCategoryBox(source);
  showToast(`Created & selected stall category "${catName}"`);
}

// ── Step 1: Custom Cuisine Adder (Task 9) ──
function addCustomCuisine(source = 'desktop') {
  const inputId = source === 'mobile' ? 'mobile-input-custom-cuisine' : 'desktop-input-custom-cuisine';
  const input = document.getElementById(inputId);
  if (!input || !input.value.trim()) return;

  const val = input.value.trim();
  if (!state.details.cuisines) state.details.cuisines = [];

  // Check if chip already exists
  const existingChip = Array.from(document.querySelectorAll('#desktop-cuisine-chips .choice-chip, #mobile-cuisine-chips .choice-chip'))
    .find(c => getChipLabel(c).toLowerCase() === val.toLowerCase());

  if (existingChip) {
    const canonicalName = getChipLabel(existingChip);
    if (!state.details.cuisines.includes(canonicalName)) {
      state.details.cuisines.push(canonicalName);
    }
    document.querySelectorAll('.step-container[data-step-id="view-details"] .choice-chip:not([data-city])').forEach(c => {
      if (getChipLabel(c).toLowerCase() === canonicalName.toLowerCase()) {
        setChipState(c, true);
      }
    });
    input.value = '';
    showToast(`Selected "${canonicalName}"`);
    return;
  }

  if (!state.details.cuisines.includes(val)) {
    state.details.cuisines.push(val);
  }

  ['desktop-cuisine-chips', 'mobile-cuisine-chips'].forEach(containerId => {
    const container = document.getElementById(containerId);
    if (container) {
      const chip = document.createElement('span');
      chip.className = 'choice-chip active';
      chip.setAttribute('data-cuisine', val);
      chip.innerHTML = `<span class="chip-check">✓</span> ${val}`;
      const adder = container.querySelector('.chip-custom-adder');
      if (adder) {
        container.insertBefore(chip, adder);
      } else {
        container.appendChild(chip);
      }
    }
  });

  input.value = '';
  const otherInputId = source === 'mobile' ? 'desktop-input-custom-cuisine' : 'mobile-input-custom-cuisine';
  const otherInput = document.getElementById(otherInputId);
  if (otherInput) otherInput.value = '';

  showToast(`Added custom cuisine "${val}"`);
}

// ── Step 1: Custom Serviceable City Adder (Task 10) ──
function addCustomCity(source = 'desktop') {
  const inputId = source === 'mobile' ? 'mobile-input-custom-city' : 'desktop-input-custom-city';
  const input = document.getElementById(inputId);
  if (!input || !input.value.trim()) return;

  const val = input.value.trim();
  if (!state.details.serviceCities) state.details.serviceCities = [];

  // Check if chip already exists
  const existingChip = Array.from(document.querySelectorAll('#desktop-service-cities-grid .choice-chip, #mobile-service-cities-grid .choice-chip'))
    .find(c => (c.getAttribute('data-city') || getChipLabel(c)).toLowerCase() === val.toLowerCase());

  if (existingChip) {
    const canonicalName = existingChip.getAttribute('data-city') || getChipLabel(existingChip);
    if (!state.details.serviceCities.includes(canonicalName)) {
      state.details.serviceCities.push(canonicalName);
    }
    document.querySelectorAll('.step-container[data-step-id="view-details"] .choice-chip[data-city]').forEach(c => {
      if ((c.getAttribute('data-city') || getChipLabel(c)).toLowerCase() === canonicalName.toLowerCase()) {
        setChipState(c, true);
      }
    });
    input.value = '';
    showToast(`Selected "${canonicalName}"`);
    return;
  }

  if (!state.details.serviceCities.includes(val)) {
    state.details.serviceCities.push(val);
  }

  ['desktop-service-cities-grid', 'mobile-service-cities-grid'].forEach(containerId => {
    const container = document.getElementById(containerId);
    if (container) {
      const chip = document.createElement('span');
      chip.className = 'choice-chip active';
      chip.setAttribute('data-city', val);
      chip.innerHTML = `<span class="chip-check">✓</span> ${val}`;
      const adder = container.querySelector('.chip-custom-adder');
      if (adder) {
        container.insertBefore(chip, adder);
      } else {
        container.appendChild(chip);
      }
    }
  });

  input.value = '';
  const otherInputId = source === 'mobile' ? 'desktop-input-custom-city' : 'mobile-input-custom-city';
  const otherInput = document.getElementById(otherInputId);
  if (otherInput) otherInput.value = '';

  showToast(`Added serviceable city "${val}"`);
}


// ── Stall Delicacies Engine (Fixed Set Spread format) ──
function setStallMenuType(type = 'fixed') {
  state.stall.menuType = 'fixed';
  document.querySelectorAll('.stall-format-card').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-format') === 'fixed');
  });
}

function renderDelicaciesList() {
  const containers = document.querySelectorAll('.delicacies-catalog-container');
  containers.forEach(c => {
    c.innerHTML = state.stall.delicacies.map(d => `
      <div class="dish-card" id="del-row-${d.id}">
        <div class="dish-card-left">
          <img src="${d.photo}" alt="${d.name}" class="dish-thumb" onerror="this.src='https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=70'" />
          <div class="dish-info">
            <div class="dish-name-row">
              <span class="fssai-icon ${d.diet}"></span>
              <span class="dish-name">${d.name}</span>
              <span class="counter-price-tag" style="font-size:12px;margin-left:6px;">₹${d.price}</span>
            </div>
            <p class="dish-desc">${d.desc}</p>
          </div>
        </div>
        <div class="dish-card-actions">
          <button type="button" class="btn-icon-action" onclick="openDelicacyEditor('${d.id}')">✎</button>
          <button type="button" class="btn-icon-action" onclick="deleteDelicacy('${d.id}')">✕</button>
        </div>
      </div>
    `).join('');
  });
}

function openDelicacyEditor(delId) {
  state.activeEditDelicacyId = delId;
  const modal = document.getElementById('modal-delicacy-editor');
  if (!modal) return;

  if (delId) {
    const item = state.stall.delicacies.find(d => d.id === delId);
    if (item) {
      document.getElementById('del-input-name').value = item.name;
      document.getElementById('del-input-diet').value = item.diet;
      document.getElementById('del-input-price').value = item.price;
      document.getElementById('del-input-desc').value = item.desc;
      document.getElementById('del-input-photo').value = item.photo;
    }
  } else {
    document.getElementById('del-input-name').value = '';
    document.getElementById('del-input-diet').value = 'veg';
    document.getElementById('del-input-price').value = '180';
    document.getElementById('del-input-desc').value = '';
    document.getElementById('del-input-photo').value = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=70';
  }

  modal.classList.add('open');
}

function closeDelicacyEditor() {
  const modal = document.getElementById('modal-delicacy-editor');
  if (modal) modal.classList.remove('open');
  state.activeEditDelicacyId = null;
}

function saveDelicacyEditor() {
  const name = document.getElementById('del-input-name').value.trim();
  if (!name) {
    showToast("Please enter a delicacy name.");
    return;
  }
  const diet = document.getElementById('del-input-diet').value;
  const price = Number(document.getElementById('del-input-price').value) || 150;
  const desc = document.getElementById('del-input-desc').value.trim();
  const photo = document.getElementById('del-input-photo').value.trim() || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=70';

  if (state.activeEditDelicacyId) {
    const item = state.stall.delicacies.find(d => d.id === state.activeEditDelicacyId);
    if (item) {
      item.name = name;
      item.diet = diet;
      item.price = price;
      item.desc = desc;
      item.photo = photo;
    }
    showToast(`Updated "${name}"`);
  } else {
    state.stall.delicacies.push({
      id: `del-${Date.now()}`,
      name,
      diet,
      price,
      desc,
      photo
    });
    showToast(`Added "${name}" to stall menu`);
  }

  closeDelicacyEditor();
  renderDelicaciesList();
}

function deleteDelicacy(delId) {
  state.stall.delicacies = state.stall.delicacies.filter(d => d.id !== delId);
  renderDelicaciesList();
  showToast("Delicacy removed.");
}

// ── Step 7: Baina Gifting Box Engine ──
function setPackagingStyle(styleKey) {
  state.baina.packaging = styleKey;
  document.querySelectorAll('.packaging-card').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-package-style') === styleKey);
  });
}

function renderBainaBoxList() {
  const containers = document.querySelectorAll('.baina-box-catalog-container');
  containers.forEach(c => {
    c.innerHTML = state.baina.boxes.map(b => `
      <div class="dish-card" id="box-row-${b.id}">
        <div class="dish-card-left">
          <img src="${b.photo}" alt="${b.name}" class="dish-thumb" onerror="this.src='https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=70'" />
          <div class="dish-info">
            <div class="dish-name-row">
              <span class="dish-name">${b.name}</span>
            </div>
            <p class="dish-desc">${b.contents}</p>
            <div class="dish-meta-row" style="margin-top:5px;">
              <span class="review-pill" style="font-weight:700;color:var(--color-red);">½ kg: ₹${b.priceHalfKg}</span>
              ${b.priceOneKg ? `<span class="review-pill" style="font-weight:700;">1 kg: ₹${b.priceOneKg}</span>` : ''}
              ${b.customSizes.map(s => `<span class="service-pill">${s.label}: ₹${s.price}</span>`).join('')}
            </div>
          </div>
        </div>
        <div class="dish-card-actions">
          <button type="button" class="btn-icon-action" onclick="openBoxEditor('${b.id}')">✎</button>
          <button type="button" class="btn-icon-action" onclick="deleteBox('${b.id}')">✕</button>
        </div>
      </div>
    `).join('');
  });
}

function openBoxEditor(boxId) {
  state.activeEditBoxId = boxId;
  const modal = document.getElementById('modal-box-editor');
  if (!modal) return;

  if (boxId) {
    const box = state.baina.boxes.find(b => b.id === boxId);
    if (box) {
      document.getElementById('box-input-name').value = box.name;
      document.getElementById('box-input-contents').value = box.contents;
      document.getElementById('box-input-halfkg').value = box.priceHalfKg;
      document.getElementById('box-input-onekg').value = box.priceOneKg || '';
      document.getElementById('box-input-photo').value = box.photo;
    }
  } else {
    document.getElementById('box-input-name').value = '';
    document.getElementById('box-input-contents').value = '';
    document.getElementById('box-input-halfkg').value = '600';
    document.getElementById('box-input-onekg').value = '1100';
    document.getElementById('box-input-photo').value = 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=70';
  }

  modal.classList.add('open');
}

function closeBoxEditor() {
  const modal = document.getElementById('modal-box-editor');
  if (modal) modal.classList.remove('open');
  state.activeEditBoxId = null;
}

function saveBoxEditor() {
  const name = document.getElementById('box-input-name').value.trim();
  const contents = document.getElementById('box-input-contents').value.trim();
  const halfKg = Number(document.getElementById('box-input-halfkg').value) || 500;
  const oneKg = Number(document.getElementById('box-input-onekg').value) || 0;
  const photo = document.getElementById('box-input-photo').value.trim() || 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=70';

  if (!name || !contents) {
    showToast("Please enter box name and contents.");
    return;
  }

  if (state.activeEditBoxId) {
    const box = state.baina.boxes.find(b => b.id === state.activeEditBoxId);
    if (box) {
      box.name = name;
      box.contents = contents;
      box.priceHalfKg = halfKg;
      box.priceOneKg = oneKg;
      box.photo = photo;
    }
    showToast(`Updated "${name}"`);
  } else {
    state.baina.boxes.push({
      id: `box-${Date.now()}`,
      name,
      contents,
      priceHalfKg: halfKg,
      priceOneKg: oneKg,
      customSizes: [{ label: "250g", price: Math.round(halfKg * 0.6) }],
      photo
    });
    showToast(`Added "${name}" to box catalog`);
  }

  closeBoxEditor();
  renderBainaBoxList();
}

function deleteBox(boxId) {
  state.baina.boxes = state.baina.boxes.filter(b => b.id !== boxId);
  renderBainaBoxList();
  showToast("Gifting box removed.");
}

// ── Consolidated Review & Submit (Sony's Core Requirement) ──
function renderMasterReview() {
  const container = document.getElementById('master-review-content');
  if (!container) return;

  const hasCatering = state.selectedOfferings.includes('catering');
  const hasStall = state.selectedOfferings.includes('stall');
  const hasBaina = state.selectedOfferings.includes('baina');

  let html = `
    <!-- 1. Vendor Identity & Operations Review (Zero Badges) -->
    <div class="review-section-card">
      <div class="review-section-header">
        <div class="review-section-title">
          <span>🏛️</span>
          <span>Vendor Identity & Kitchen Operations</span>
        </div>
        <button type="button" class="btn-review-edit" onclick="goToStep('view-details')">Edit Details ✎</button>
      </div>
      <div class="form-grid-2">
        <div>
          <p style="font-size:11px;color:var(--color-black-60);">Trading Brand Name</p>
          <p style="font-size:14px;font-weight:800;color:var(--color-black);">${state.details.businessName}</p>
        </div>
        <div>
          <p style="font-size:11px;color:var(--color-black-60);">Account Holder (From Signup)</p>
          <p style="font-size:13px;font-weight:700;">${state.account.name} · +91 ${state.account.phone} <span class="badge" style="background:var(--color-cream);color:var(--color-red);font-size:10px;padding:2px 6px;border-radius:9999px;">✓ Linked</span></p>
          <p style="font-size:11px;color:var(--color-black-60);margin-top:2px;">${state.account.email}</p>
        </div>
        <div>
          <p style="font-size:11px;color:var(--color-black-60);">City & State</p>
          <p style="font-size:13px;font-weight:700;">${state.details.city}, ${state.details.state}</p>
        </div>
        <div>
          <p style="font-size:11px;color:var(--color-black-60);">Coverage Cities</p>
          <p style="font-size:12px;font-weight:600;">${state.details.serviceCities.join(', ')}</p>
        </div>
      </div>
      <div class="form-grid-2" style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--color-cream-30);">
        <div>
          <p style="font-size:11px;color:var(--color-black-60);">Dietary Offering (Food Classification)</p>
          <p style="font-size:13px;font-weight:800;color:var(--color-black);">
            ${state.details.dietaryOffering === 'veg' ? 'Pure Vegetarian (100% Veg Kitchen)' : state.details.dietaryOffering === 'non-veg' ? 'Non-Vegetarian Only' : state.details.dietaryOffering === 'both' ? 'Both Veg & Non-Veg (Separated Prep)' : 'Not selected'}
          </p>
        </div>
        <div>
          <p style="font-size:11px;color:var(--color-black-60);">Primary Cuisines</p>
          <p style="font-size:12px;font-weight:700;color:var(--color-red);">${state.details.cuisines.join(' · ')}</p>
        </div>
      </div>
    </div>
  `;

  // 2. Feast Catering Review (if selected)
  if (hasCatering) {
    const dishesByCourse = {};
    state.catering.courses.forEach(c => {
      dishesByCourse[c.id] = state.catering.dishes.filter(d => d.course === c.id);
    });

    const activeLiveCounters = state.catering.availableCounters.filter(ac => state.catering.liveCounters.includes(ac.id));
    const cutleryChoice = state.catering.cutleryTiers.find(ct => ct.id === state.catering.cutleryTier);

    html += `
      <div class="review-section-card">
        <div class="review-section-header">
          <div class="review-section-title">
            <span>🍲</span>
            <span>Feast Booking: ${state.catering.packageName}</span>
          </div>
          <button type="button" class="btn-review-edit" onclick="goToStep('view-cat-dishes')">Edit Feast ✎</button>
        </div>

        <div style="margin-bottom:14px;">
          <p style="font-size:12px;color:var(--color-black-80);line-height:1.4;">${state.catering.description}</p>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
            <span class="review-pill"><strong>Best For:</strong> ${state.catering.bestFor.join(', ')}</span>
            <span class="review-pill"><strong>Guest Range:</strong> ${state.catering.minPax}–${state.catering.maxPax} Pax</span>
            <span class="review-pill"><strong>Lead Notice:</strong> ${state.catering.leadHours} Hours</span>
            <span class="review-pill" style="color:var(--color-red);"><strong>Starting From:</strong> ₹${state.catering.tierPrices.silver}/plate</span>
          </div>
        </div>

        <!-- Sequential Tiers Configured -->
        <div class="review-subitem-group" style="padding-top:10px;border-top:1px dashed var(--color-cream-30);">
          <div class="review-subitem-title">Configured Feast Tiers & Specialization</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:12px;background:var(--color-cream-10);border:1px solid var(--color-cream-30);padding:8px 12px;border-radius:var(--radius-control);">
              <strong>Silver Tier (Bhoj City Base)</strong> · ₹${state.catering.tierPrices.silver}/plate
              <div style="color:var(--color-black-60);font-size:11px;margin-top:2px;">
                Allowances: Starters (${state.catering.tierQuotas.silver.starters}), Main (${state.catering.tierQuotas.silver.main}), Breads (${state.catering.tierQuotas.silver.breads}), Sweets (${state.catering.tierQuotas.silver.sweets}) · <em>Standard base package (no specialization)</em>
              </div>
            </div>
            <div style="font-size:12px;background:#FFFDF8;border:1px solid #F59E0B;padding:8px 12px;border-radius:var(--radius-control);">
              <strong style="color:#B45309;">Gold Tier (Bhoj Signature Featured)</strong> · ₹${state.catering.tierPrices.gold}/plate
              <div style="color:var(--color-black-80);font-size:11px;margin-top:2px;">
                Specialization: <strong>${state.catering.goldSpecialization}</strong>
              </div>
              <div style="color:var(--color-black-60);font-size:11px;margin-top:2px;">
                Allowances: Starters (${state.catering.tierQuotas.gold.starters}), Main (${state.catering.tierQuotas.gold.main}), Breads (${state.catering.tierQuotas.gold.breads}), Sweets (${state.catering.tierQuotas.gold.sweets})
              </div>
            </div>
            <div style="font-size:11.5px;color:var(--color-black-40);padding:4px 8px;">
              Platinum Luxury (₹${state.catering.tierPrices.platinum}/plate) · <em>Coming Soon</em>
            </div>
          </div>
        </div>

        <!-- Itemized Courses & Dishes -->
        <div class="review-subitem-group" style="margin-top:12px;">
          <div class="review-subitem-title">Itemized Menu Courses (${state.catering.dishes.length} Dishes Published)</div>
          ${state.catering.courses.map(cat => {
            const items = dishesByCourse[cat.id] || [];
            return `
              <div style="margin-bottom:8px;">
                <div style="font-size:12px;font-weight:700;color:var(--color-black-80);display:flex;align-items:center;gap:4px;">
                  <span>${cat.icon}</span> <span>${cat.name} (${items.length}):</span>
                </div>
                <div class="review-pills-row" style="margin-top:4px;">
                  ${items.map(it => `
                    <span class="review-pill">
                      <span class="fssai-icon ${it.diet}" style="transform:scale(0.8);"></span>
                      ${it.name}
                      <small style="color:var(--color-black-40);">(${it.tiers.join('/')})</small>
                    </span>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Feast Inclusions: Live Counters, Extras, Essentials, Add-ons (Tasks 13–16) -->
        <div class="review-subitem-group" style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--color-cream-30);">
          <div class="review-subitem-title">Configured Feast Offering Inclusions</div>
          
          <!-- 13. Feast Live Counters -->
          <div style="margin-bottom:8px;">
            <div style="font-size:12px;font-weight:700;color:var(--color-black-80);display:flex;align-items:center;gap:4px;">
              <span>🍳</span> <span>Live Counters (${activeLiveCounters.length}):</span>
            </div>
            <div class="review-pills-row" style="margin-top:4px;">
              ${activeLiveCounters.length > 0 
                ? activeLiveCounters.map(alc => `<span class="review-pill" style="border-color:var(--color-red-40);">${alc.icon} <strong>${alc.name}</strong> (+₹${alc.rate}/p)</span>`).join('')
                : '<span class="review-pill" style="color:var(--color-black-40);">None configured</span>'}
            </div>
          </div>

          <!-- 14. Feast Extras -->
          <div style="margin-bottom:8px;">
            <div style="font-size:12px;font-weight:700;color:var(--color-black-80);display:flex;align-items:center;gap:4px;">
              <span>✨</span> <span>Feast Hospitality Extras (${(state.catering.extras || []).length}):</span>
            </div>
            <div class="review-pills-row" style="margin-top:4px;">
              ${(state.catering.extras && state.catering.extras.length > 0)
                ? (state.catering.availableExtras || []).filter(ae => state.catering.extras.includes(ae.id)).map(ae => `<span class="service-pill">${ae.icon} ${ae.name} (${ae.rate})</span>`).join('')
                : '<span class="review-pill" style="color:var(--color-black-40);">None configured</span>'}
            </div>
          </div>

          <!-- 15. Feast Essentials -->
          <div style="margin-bottom:8px;">
            <div style="font-size:12px;font-weight:700;color:var(--color-black-80);display:flex;align-items:center;gap:4px;">
              <span>🧑‍🍳</span> <span>Service Crew & Hygiene Essentials:</span>
            </div>
            <div class="review-pills-row" style="margin-top:4px;">
              ${state.catering.serviceInclusions.staff ? '<span class="service-pill">✓ Uniformed Stewards & Captain</span>' : ''}
              ${state.catering.serviceInclusions.buffetTables ? '<span class="service-pill">✓ Designer Buffet Tables & Linens</span>' : ''}
              ${state.catering.serviceInclusions.foodLabels ? '<span class="service-pill">✓ Acrylic Bilingual Food Labels</span>' : ''}
              ${state.catering.serviceInclusions.handwashStation ? '<span class="service-pill">✓ Handwash & Sanitizers</span>' : ''}
              ${state.catering.serviceInclusions.wasteBins ? '<span class="service-pill">✓ Dustbins & Waste Crew</span>' : ''}
              ${state.catering.serviceInclusions.hygieneCrew ? '<span class="service-pill">✓ Continuous Cleaning Crew</span>' : ''}
            </div>
          </div>

          <!-- 16. Feast Add-ons / Tableware Presentation Tiers -->
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--color-black-80);display:flex;align-items:center;gap:4px;">
              <span>🍽️</span> <span>Tableware Presentation Add-on:</span>
            </div>
            <div style="margin-top:4px;font-size:12px;">
              <span class="review-pill" style="border-color:var(--color-cream-60);font-weight:700;">
                ${cutleryChoice ? `${cutleryChoice.name} (${cutleryChoice.rate})` : 'Standard Tableware'}
              </span>
              <span style="font-size:11px;color:var(--color-black-60);margin-left:6px;">${cutleryChoice ? cutleryChoice.desc : ''}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 3. Live Counters Review (if selected)
  if (state.selectedOfferings.includes('counters')) {
    const activeLiveCounters = state.catering.availableCounters.filter(ac => state.catering.liveCounters.includes(ac.id));
    html += `
      <div class="review-section-card">
        <div class="review-section-header">
          <div class="review-section-title">
            <span>🍳</span>
            <span>Live Counters (${activeLiveCounters.length} Counters Configured)</span>
          </div>
          <button type="button" class="btn-review-edit" onclick="goToStep('view-cat-live')">Edit Counters ✎</button>
        </div>
        <p style="font-size:12px;color:var(--color-black-80);margin-bottom:8px;">Interactive on-site cooking and beverage stations.</p>
        <div class="review-pills-row">
          ${activeLiveCounters.map(alc => `
            <span class="review-pill" style="border-color:var(--color-red-40);">
              <span>${alc.icon}</span> <strong>${alc.name}</strong> (+₹${alc.rate}/plate)
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 4. Extras Review (if selected)
  if (state.selectedOfferings.includes('extras')) {
    html += `
      <div class="review-section-card">
        <div class="review-section-header">
          <div class="review-section-title">
            <span>🪑</span>
            <span>Extras: Event Rentals & Equipment</span>
          </div>
          <button type="button" class="btn-review-edit" onclick="goToStep('view-cat-extras')">Edit Extras ✎</button>
        </div>
        <p style="font-size:12px;color:var(--color-black-80);margin-bottom:8px;">Additional buffet equipment, chafing warmers, and event furniture rentals.</p>
        <div class="review-pills-row">
          <span class="service-pill">✓ Heavy-Duty Chafing Dishes & Food Warmers</span>
          <span class="service-pill">✓ Designer Buffet Tables & Banquet Linens</span>
          <span class="service-pill">✓ Live Mocktail & Beverage Glassware</span>
          <span class="service-pill">✓ Traditional Brass & Copper Cookware</span>
        </div>
      </div>
    `;
  }

  // 5. Add-ons Review (if selected)
  if (state.selectedOfferings.includes('addons')) {
    html += `
      <div class="review-section-card">
        <div class="review-section-header">
          <div class="review-section-title">
            <span>🍹</span>
            <span>Add-ons: Refreshments & Dessert Spreads</span>
          </div>
          <button type="button" class="btn-review-edit" onclick="goToStep('view-cat-extras')">Edit Add-ons ✎</button>
        </div>
        <p style="font-size:12px;color:var(--color-black-80);margin-bottom:8px;">Supplementary guest experience enhancements and special food spreads.</p>
        <div class="review-pills-row">
          <span class="service-pill">✓ Welcome Drinks & Mocktail Coolers</span>
          <span class="service-pill">✓ Artisanal Live Dessert & Halwai Studio</span>
          <span class="service-pill">✓ Midnight Snack & Chai Stations</span>
        </div>
      </div>
    `;
  }

  // 6. Essentials Review (if selected)
  if (state.selectedOfferings.includes('essentials')) {
    const cutleryChoice = state.catering.cutleryTiers.find(ct => ct.id === state.catering.cutleryTier);
    html += `
      <div class="review-section-card">
        <div class="review-section-header">
          <div class="review-section-title">
            <span>🍽️</span>
            <span>Essentials: Service Crew & Tableware</span>
          </div>
          <button type="button" class="btn-review-edit" onclick="goToStep('view-cat-extras')">Edit Essentials ✎</button>
        </div>
        <div style="font-size:12px;font-weight:700;color:var(--color-black);">
          Selected Tableware: ${cutleryChoice?.name || "Standard Tableware"} <span style="color:var(--color-red);">(${cutleryChoice?.rate || "Included"})</span>
        </div>
        <p style="font-size:11px;color:var(--color-black-60);margin-top:2px;">${cutleryChoice?.desc}</p>
        <div class="review-pills-row" style="margin-top:8px;">
          <span class="service-pill">✓ Uniformed Stewards & Service Captain</span>
          <span class="service-pill">✓ Acrylic Bilingual Food Labels</span>
          <span class="service-pill">✓ Handwash Setup & Sanitization</span>
          <span class="service-pill">✓ Dedicated Waste Management Crew</span>
        </div>
      </div>
    `;
  }

  // 3. Stall Review (if selected)
  if (hasStall) {
    html += `
      <div class="review-section-card">
        <div class="review-section-header">
          <div class="review-section-title">
            <span>🍢</span>
            <span>Single Stall: ${state.stall.stallName || state.details.businessName || 'Specialty Food Stall'}</span>
          </div>
          <button type="button" class="btn-review-edit" onclick="goToStep('view-stall-delicacies')">Edit Stall ✎</button>
        </div>
        <div style="margin-bottom:12px;">
          <p style="font-size:12px;color:var(--color-black-80);">${state.stall.tagline}</p>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
            <span class="review-pill"><strong>Specialty:</strong> ${state.stall.specialty}</span>
            <span class="review-pill"><strong>Format:</strong> ${state.stall.menuType === 'fixed' ? `Fixed Set Spread (₹${state.stall.fixedPerPlate}/pax)` : 'Varied Build-Your-Own'}</span>
            <span class="review-pill"><strong>Min Guarantee:</strong> ${state.stall.minPaxGuarantee} Pax</span>
          </div>
        </div>

        <div class="review-subitem-group">
          <div class="review-subitem-title">Stall Delicacies (${state.stall.delicacies.length} Items)</div>
          <div class="review-pills-row">
            ${state.stall.delicacies.map(d => `
              <span class="review-pill">
                <span class="fssai-icon ${d.diet}" style="transform:scale(0.8);"></span>
                ${d.name} · <strong>₹${d.price}</strong>
              </span>
            `).join('')}
          </div>
        </div>

        <div class="review-subitem-group" style="padding-top:8px;border-top:1px dashed var(--color-cream-30);">
          <div class="review-subitem-title">On-Site Equipment & Stall Cutlery</div>
          <div class="review-pills-row">
            ${state.stall.liveEquipment.map(eq => `<span class="service-pill">${eq}</span>`).join('')}
            <span class="review-pill" style="font-size:11px;">🍽️ ${state.stall.cutleryOption}</span>
          </div>
        </div>
      </div>
    `;
  }

  // 4. Baina Review (if selected)
  if (hasBaina) {
    html += `
      <div class="review-section-card">
        <div class="review-section-header">
          <div class="review-section-title">
            <span>🎁</span>
            <span>Baina Gifting: ${state.baina.studioName}</span>
          </div>
          <button type="button" class="btn-review-edit" onclick="goToStep('view-baina-boxes')">Edit Baina ✎</button>
        </div>
        <div style="margin-bottom:12px;">
          <p style="font-size:12px;color:var(--color-black-80);">${state.baina.story}</p>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
            <span class="review-pill"><strong>Min Order:</strong> ${state.baina.minOrderBoxes} Boxes</span>
            <span class="review-pill"><strong>Lead Notice:</strong> ${state.baina.leadDays} Days</span>
            <span class="review-pill"><strong>Packaging Style:</strong> ${state.baina.packaging.toUpperCase()}</span>
          </div>
        </div>

        <div class="review-subitem-group">
          <div class="review-subitem-title">Artisanal Gifting Box Catalog (${state.baina.boxes.length} Hampers)</div>
          ${state.baina.boxes.map(b => `
            <div style="margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--color-cream-10);">
              <div style="font-size:12px;font-weight:700;">${b.name}</div>
              <p style="font-size:11px;color:var(--color-black-60);">${b.contents}</p>
              <div style="display:flex;gap:6px;margin-top:4px;">
                <span class="review-pill">½ kg: ₹${b.priceHalfKg}</span>
                ${b.priceOneKg ? `<span class="review-pill">1 kg: ₹${b.priceOneKg}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 5. Custom Commercial Offerings Review (Task 8)
  if (state.customOfferings && state.customOfferings.length > 0) {
    const selectedCustoms = state.customOfferings.filter(c => state.selectedOfferings.includes(c.id));
    if (selectedCustoms.length > 0) {
      html += `
        <div class="review-section-card">
          <div class="review-section-header">
            <div class="review-section-title">
              <span>✨</span>
              <span>Custom Service Offerings (${selectedCustoms.length})</span>
            </div>
            <button type="button" class="btn-review-edit" onclick="goToStep('view-offerings')">Edit Offerings ✎</button>
          </div>
          <div class="review-grid">
            ${selectedCustoms.map(c => `
              <div class="review-stat-box">
                <div class="review-stat-label">Custom Service Offering</div>
                <div class="review-stat-val" style="font-size:14px;font-weight:800;">${escapeHtml(c.title)}</div>
                <div style="font-size:11.5px;color:var(--color-black-60);margin-top:2px;">${escapeHtml(c.blurb)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}

// ── Storefront Preview Modal (Sony: "Preview storefront is good but additional") ──
function openStorefrontPreview() {
  const modal = document.getElementById('modal-storefront-preview');
  if (!modal) return;

  // Populate preview card
  const heroImg = document.getElementById('sf-hero-image');
  if (heroImg) heroImg.src = state.catering.heroImage || "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=70";

  const brandEl = document.getElementById('sf-brand-name');
  if (brandEl) brandEl.textContent = state.details.businessName;

  const cuisinesEl = document.getElementById('sf-cuisines');
  if (cuisinesEl) cuisinesEl.textContent = state.details.cuisines.join(' · ');

  const cityEl = document.getElementById('sf-city');
  if (cityEl) cityEl.textContent = `${state.details.city} · Min ${state.catering.minPax} Guests`;

  const priceEl = document.getElementById('sf-price');
  if (priceEl) priceEl.textContent = `₹${state.catering.tierPrices.silver}`;

  const ratingEl = document.getElementById('sf-rating');
  if (ratingEl) ratingEl.textContent = `${state.details.googleRating} ★`;

  const tagsContainer = document.getElementById('sf-signature-tags');
  if (tagsContainer) {
    const featuredDishes = state.catering.dishes.filter(d => d.isFeatured);
    tagsContainer.innerHTML = featuredDishes.map(d => `<span class="spread-chip" style="background:var(--color-cream);color:var(--color-red);font-weight:700;">${d.name}</span>`).join('');
  }

  modal.classList.add('open');
}

function closeStorefrontPreview() {
  const modal = document.getElementById('modal-storefront-preview');
  if (modal) modal.classList.remove('open');
}

// ── Scenario Presets Engine ──
function applyScenarioPreset(presetKey) {
  if (presetKey === 'catering') {
    state.selectedOfferings = ['catering', 'counters', 'extras', 'essentials'];
    state.details.dietaryOffering = 'both';
    state.details.businessName = "Royal Awadh Caterers";
    state.catering.packageName = "Grand Wedding Dastarkhwan";
    goToStep('view-offerings');
    showToast("Loaded 'Feast Booking Partner' Scenario");
  } else if (presetKey === 'stall') {
    state.selectedOfferings = ['stall'];
    state.details.dietaryOffering = 'both';
    state.details.businessName = "Awadhi Dum Biryani Corner";
    goToStep('view-offerings');
    showToast("Loaded 'Specialty Food Stall' Scenario");
  } else if (presetKey === 'baina') {
    state.selectedOfferings = ['baina'];
    state.details.dietaryOffering = 'veg';
    state.details.businessName = "Ram Asrey Royal Baina Studio";
    goToStep('view-offerings');
    showToast("Loaded 'Mithai & Baina Artisan' Scenario");
  } else if (presetKey === 'all') {
    state.selectedOfferings = ['catering', 'stall', 'baina', 'counters', 'extras', 'addons', 'essentials'];
    state.details.dietaryOffering = 'both';
    state.details.businessName = "Royal Awadh Hospitality Group";
    goToStep('view-offerings');
    showToast("Loaded 'Multi-Service Partner (All 7)' Scenario");
  } else if (!presetKey || presetKey === 'custom') {
    state.selectedOfferings = [];
    goToStep('view-offerings');
    showToast("Switched to Custom Onboarding (Manual Selection)");
  }

  // Update diet cards UI
  if (state.details.dietaryOffering) {
    setDietaryOffering(state.details.dietaryOffering);
  }

  // Update UI selection cards
  document.querySelectorAll('.offering-card').forEach(c => {
    const key = c.getAttribute('data-offering-key');
    const isSelected = state.selectedOfferings.includes(key);
    c.classList.toggle('active', isSelected);
    const box = c.querySelector('.offering-checkbox');
    if (box) box.textContent = isSelected ? '✓' : '';
  });

  updateVendorContextHeader();
}

// ── Viewport Canvas Mode Engine ──
function setViewMode(mode) {
  document.body.className = `mode-${mode}`;
  document.querySelectorAll('.prototype-bar .btn-toggle').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });
}

// ── Toast Notification Helper ──
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}

// ── Universal Choice Chip Interactive Selection Engine ──
function getChipLabel(chip) {
  const clone = chip.cloneNode(true);
  const check = clone.querySelector('.chip-check');
  if (check) check.remove();
  return clone.textContent.replace(/[✓✔\s]+/g, ' ').trim();
}

function setChipState(chip, isActive) {
  const label = getChipLabel(chip);
  if (isActive) {
    chip.classList.add('active');
    chip.innerHTML = `<span class="chip-check">✓</span> ${label}`;
  } else {
    chip.classList.remove('active');
    chip.innerHTML = label;
  }
}

function toggleChoiceChip(chip) {
  const isCurrentlyActive = chip.classList.contains('active');
  const nextActive = !isCurrentlyActive;
  const label = getChipLabel(chip);

  setChipState(chip, nextActive);
  syncChipToState(chip, label, nextActive);
}

function syncChipToState(chip, label, isNowActive) {
  const stepContainer = chip.closest('.step-container');
  if (!stepContainer) return;
  const stepId = stepContainer.getAttribute('data-step-id');

  if (stepId === 'view-details') {
    const isCity = chip.hasAttribute('data-city') || chip.closest('[data-chip-type="city"]');
    if (isCity) {
      // Step 1: Serviceable Coverage Cities (Task 10)
      const cityVal = chip.getAttribute('data-city') || label;
      if (!state.details.serviceCities) state.details.serviceCities = [];
      if (isNowActive && !state.details.serviceCities.includes(cityVal)) {
        state.details.serviceCities.push(cityVal);
      } else if (!isNowActive) {
        state.details.serviceCities = state.details.serviceCities.filter(c => c !== cityVal);
      }
      // Mirror to matching city chip in the other frame
      document.querySelectorAll('.step-container[data-step-id="view-details"] .choice-chip[data-city]').forEach(other => {
        if (other !== chip && (other.getAttribute('data-city') === cityVal || getChipLabel(other) === cityVal) && other.classList.contains('active') !== isNowActive) {
          setChipState(other, isNowActive);
        }
      });
    } else {
      // Step 1: Primary Cuisines (Task 9)
      const cuisineVal = chip.getAttribute('data-cuisine') || label;
      if (!state.details.cuisines) state.details.cuisines = [];
      if (isNowActive && !state.details.cuisines.includes(cuisineVal)) {
        state.details.cuisines.push(cuisineVal);
      } else if (!isNowActive) {
        state.details.cuisines = state.details.cuisines.filter(c => c !== cuisineVal);
      }
      // Mirror to matching cuisine chip in the other frame
      document.querySelectorAll('.step-container[data-step-id="view-details"] .choice-chip:not([data-city])').forEach(other => {
        if (other !== chip && (other.getAttribute('data-cuisine') === cuisineVal || getChipLabel(other) === cuisineVal) && other.classList.contains('active') !== isNowActive) {
          setChipState(other, isNowActive);
        }
      });
    }
  } else if (stepId === 'view-cat-basics') {
    // Step 5A: Feast Best For Occasions
    if (!state.catering.bestFor) state.catering.bestFor = [];
    if (isNowActive && !state.catering.bestFor.includes(label)) {
      state.catering.bestFor.push(label);
    } else if (!isNowActive) {
      state.catering.bestFor = state.catering.bestFor.filter(c => c !== label);
    }
    // Mirror to matching chip in the other frame
    document.querySelectorAll('.step-container[data-step-id="view-cat-basics"] .choice-chip').forEach(other => {
      if (other !== chip && getChipLabel(other) === label && other.classList.contains('active') !== isNowActive) {
        setChipState(other, isNowActive);
      }
    });
  } else if (stepId === 'view-cat-extras') {
    // Step 5F: Essential Service Inclusions (Task 15)
    const essentialKey = chip.getAttribute('data-essential-key');
    if (essentialKey) {
      if (!state.catering.serviceInclusions) state.catering.serviceInclusions = {};
      state.catering.serviceInclusions[essentialKey] = isNowActive;
      document.querySelectorAll(`.choice-chip[data-essential-key="${essentialKey}"]`).forEach(other => {
        if (other !== chip && other.classList.contains('active') !== isNowActive) {
          setChipState(other, isNowActive);
        }
      });
    }
  } else if (stepId === 'view-stall-basics') {
    // Step 6A: Stall Occasions
    if (!state.stall.bestFor) state.stall.bestFor = [];
    if (isNowActive && !state.stall.bestFor.includes(label)) {
      state.stall.bestFor.push(label);
    } else if (!isNowActive) {
      state.stall.bestFor = state.stall.bestFor.filter(c => c !== label);
    }
  } else if (stepId === 'view-stall-live') {
    // Step 6E: Stall Live Equipment
    if (!state.stall.liveEquipment) state.stall.liveEquipment = [];
    if (isNowActive && !state.stall.liveEquipment.includes(label)) {
      state.stall.liveEquipment.push(label);
    } else if (!isNowActive) {
      state.stall.liveEquipment = state.stall.liveEquipment.filter(c => c !== label);
    }
  } else if (stepId === 'view-baina-basics') {
    // Step 7A: Baina Gifting Occasions
    if (!state.baina.bestFor) state.baina.bestFor = [];
    if (isNowActive && !state.baina.bestFor.includes(label)) {
      state.baina.bestFor.push(label);
    } else if (!isNowActive) {
      state.baina.bestFor = state.baina.bestFor.filter(c => c !== label);
    }
  }
}

// ── Synchronize Phase 3 State to UI Elements ──
function renderPhase3StateToUI() {
  // 1. Sync Cuisines (Task 9)
  if (state.details.cuisines) {
    state.details.cuisines.forEach(c => {
      let found = false;
      document.querySelectorAll('#desktop-cuisine-chips .choice-chip, #mobile-cuisine-chips .choice-chip').forEach(chip => {
        if ((chip.getAttribute('data-cuisine') || getChipLabel(chip)).toLowerCase() === c.toLowerCase()) {
          setChipState(chip, true);
          found = true;
        }
      });
      if (!found) {
        // Render custom chip
        ['desktop-cuisine-chips', 'mobile-cuisine-chips'].forEach(containerId => {
          const container = document.getElementById(containerId);
          if (container) {
            const chip = document.createElement('span');
            chip.className = 'choice-chip active';
            chip.setAttribute('data-cuisine', c);
            chip.innerHTML = `<span class="chip-check">✓</span> ${c}`;
            const adder = container.querySelector('.chip-custom-adder');
            if (adder) container.insertBefore(chip, adder);
            else container.appendChild(chip);
          }
        });
      }
    });
  }

  // 2. Sync Serviceable Cities (Task 10)
  if (state.details.serviceCities) {
    state.details.serviceCities.forEach(city => {
      let found = false;
      document.querySelectorAll('#desktop-service-cities-grid .choice-chip, #mobile-service-cities-grid .choice-chip').forEach(chip => {
        if ((chip.getAttribute('data-city') || getChipLabel(chip)).toLowerCase() === city.toLowerCase()) {
          setChipState(chip, true);
          found = true;
        }
      });
      if (!found) {
        // Render custom city chip
        ['desktop-service-cities-grid', 'mobile-service-cities-grid'].forEach(containerId => {
          const container = document.getElementById(containerId);
          if (container) {
            const chip = document.createElement('span');
            chip.className = 'choice-chip active';
            chip.setAttribute('data-city', city);
            chip.innerHTML = `<span class="chip-check">✓</span> ${city}`;
            const adder = container.querySelector('.chip-custom-adder');
            if (adder) container.insertBefore(chip, adder);
            else container.appendChild(chip);
          }
        });
      }
    });
  }

  // 3. Sync Minimum Preparation Notice (Task 11)
  if (state.catering.leadHours) {
    document.querySelectorAll('#cat-lead-hours, #mob-cat-lead-hours').forEach(sel => {
      sel.value = String(state.catering.leadHours);
    });
  }

  // 4. Sync Stall Categories & Specialty (Task 12)
  if (state.stall.customCategories && state.stall.customCategories.length > 0) {
    state.stall.customCategories.forEach(cat => {
      document.querySelectorAll('.stall-specialty-select').forEach(sel => {
        if (!Array.from(sel.options).some(o => o.value.toLowerCase() === cat.toLowerCase())) {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat;
          sel.appendChild(opt);
        }
      });
    });
  }
  if (state.stall.specialty) {
    document.querySelectorAll('.stall-specialty-select').forEach(sel => {
      sel.value = state.stall.specialty;
    });
  }

  // 5. Sync Live Counters (Task 13)
  if (state.catering.liveCounters) {
    document.querySelectorAll('.counter-item-card[data-counter-id]').forEach(card => {
      const id = card.getAttribute('data-counter-id');
      card.classList.toggle('active', state.catering.liveCounters.includes(id));
    });
  }

  // 6. Sync Feast Extras (Task 14)
  if (state.catering.extras) {
    document.querySelectorAll('.feast-extra-card[data-extra-id]').forEach(card => {
      const id = card.getAttribute('data-extra-id');
      card.classList.toggle('active', state.catering.extras.includes(id));
    });
  }

  // 7. Sync Feast Essentials (Task 15)
  if (state.catering.serviceInclusions) {
    document.querySelectorAll('.choice-chip[data-essential-key]').forEach(chip => {
      const key = chip.getAttribute('data-essential-key');
      const isActive = !!state.catering.serviceInclusions[key];
      setChipState(chip, isActive);
    });
  }

  // 8. Sync Tableware Add-ons (Task 16)
  if (state.catering.cutleryTier) {
    document.querySelectorAll('.cutlery-tier-card[data-cutlery-id]').forEach(card => {
      const id = card.getAttribute('data-cutlery-id');
      card.classList.toggle('active', id === state.catering.cutleryTier);
    });
  }
}

function renderAllViews() {
  syncAccountDetailsToUI();
  renderCustomOfferings();
  renderPhase3StateToUI();
  updateVendorContextHeader();
  renderDishList();
  renderTierView();
  renderDelicaciesList();
  renderBainaBoxList();
  renderDashboardView();
}

// ==========================================================================
// BHOJPATRA VENDOR DASHBOARD CONTROLLER (V1 REPLICA & V2 7-SERVICES)
// Preserves V1 layout, widgets, metrics, modals, and mobile ergonomics
// ==========================================================================

let activeDashboardTab = 'home';
let currentCatererSimState = 'active';

function toggleDashboardMode() {
  if (state.currentStepId.startsWith('view-dashboard')) {
    goToStep('view-details');
  } else {
    goToStep('view-dashboard');
  }
}

function setDashboardTab(tabName, syncStep = true) {
  activeDashboardTab = tabName;

  // Desktop tab views
  const dHome = document.getElementById('desktop-tab-home');
  const dServices = document.getElementById('desktop-tab-services');
  const dOrders = document.getElementById('desktop-tab-orders');

  if (dHome) dHome.style.display = tabName === 'home' ? 'flex' : 'none';
  if (dServices) dServices.style.display = tabName === 'services' ? 'flex' : 'none';
  if (dOrders) dOrders.style.display = tabName === 'orders' ? 'flex' : 'none';

  // Desktop nav links
  const navHome = document.getElementById('nav-item-home');
  const navServices = document.getElementById('nav-item-services');
  const navOrders = document.getElementById('nav-item-orders');
  if (navHome) navHome.classList.toggle('active', tabName === 'home');
  if (navServices) navServices.classList.toggle('active', tabName === 'services');
  if (navOrders) navOrders.classList.toggle('active', tabName === 'orders');

  // Breadcrumb
  const breadcrumb = document.getElementById('desktop-breadcrumb-current');
  if (breadcrumb) {
    if (tabName === 'home') breadcrumb.textContent = 'Dashboard Home';
    else if (tabName === 'services') breadcrumb.textContent = 'My Services & Offerings (7 Services)';
    else if (tabName === 'orders') breadcrumb.textContent = 'Orders & Capacity Pipeline';
  }

  // Mobile tab views
  const mHome = document.getElementById('mobile-tab-home');
  const mServices = document.getElementById('mobile-tab-services');
  const mOrders = document.getElementById('mobile-tab-orders');

  if (mHome) mHome.style.display = tabName === 'home' ? 'flex' : 'none';
  if (mServices) mServices.style.display = tabName === 'services' ? 'flex' : 'none';
  if (mOrders) mOrders.style.display = tabName === 'orders' ? 'flex' : 'none';

  // Mobile bottom nav items
  const mobHome = document.getElementById('mob-nav-home');
  const mobServices = document.getElementById('mob-nav-services');
  const mobOrders = document.getElementById('mob-nav-orders');
  if (mobHome) mobHome.classList.toggle('active', tabName === 'home');
  if (mobServices) mobServices.classList.toggle('active', tabName === 'services');
  if (mobOrders) mobOrders.classList.toggle('active', tabName === 'orders');

  if (syncStep) {
    if (tabName === 'home') state.currentStepId = 'view-dashboard';
    else if (tabName === 'services') state.currentStepId = 'view-dashboard-services';
    else if (tabName === 'orders') state.currentStepId = 'view-dashboard-orders';

    const jumpSelect = document.getElementById('prototype-step-jump');
    if (jumpSelect) jumpSelect.value = state.currentStepId;
  }
}

function renderDashboardView() {
  const bizName = state.details.businessName || "Royal Awadh Caterers";
  const dietVal = state.details.dietaryOffering || "both";

  // Plain Dietary Classification String (Strictly NO Badges)
  let dietLabel = "⚖️ Both Veg & Non-Veg";
  let dietShort = "Both Veg & Non-Veg";
  if (dietVal === 'veg') {
    dietLabel = "🟢 Pure Vegetarian (100% Veg Kitchen)";
    dietShort = "Pure Veg";
  } else if (dietVal === 'non-veg') {
    dietLabel = "🔴 Non-Vegetarian Kitchen";
    dietShort = "Non-Veg";
  }

  // Active Tier (Silver Base, Gold Featured, Platinum Coming Soon)
  const isGold = state.catering.activeTier === 'gold' || state.catering.silverCompleted;
  const tierShort = isGold ? "Gold Tier" : "Silver Tier";

  // Bind Desktop Sidebar
  const dName = document.getElementById('desktop-vendor-name');
  if (dName) dName.textContent = bizName;

  const dDiet = document.getElementById('desktop-vendor-diet');
  if (dDiet) dDiet.textContent = dietShort;

  const dTier = document.getElementById('desktop-vendor-tier');
  if (dTier) dTier.textContent = tierShort;

  // Bind Topbar Profile
  const dAvatar = document.getElementById('desktop-user-avatar');
  if (dAvatar) {
    const initials = bizName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'RA';
    dAvatar.textContent = initials;
  }
  const dUserName = document.getElementById('desktop-user-name');
  if (dUserName) dUserName.textContent = bizName;

  // Bind Status Banner
  const bTier = document.getElementById('badge-tier');
  if (bTier) {
    bTier.textContent = isGold ? "Gold / Bhoj Signature" : "Silver / Bhoj City";
    bTier.className = isGold ? "badge-pill badge-gold-tier" : "badge-pill badge-solid-maroon";
  }
  const bDiet = document.getElementById('badge-diet');
  if (bDiet) bDiet.textContent = dietLabel;

  // Bind Mobile Header
  const mName = document.getElementById('mobile-dash-brand-name');
  if (mName) mName.textContent = bizName;

  const mDiet = document.getElementById('mobile-strip-diet');
  if (mDiet) mDiet.textContent = dietShort;

  const mTier = document.getElementById('mobile-strip-tier');
  if (mTier) mTier.textContent = isGold ? "Gold" : "Silver";

  // Bind Active Offerings Count
  const countEl = document.getElementById('desktop-active-services-count');
  if (countEl) countEl.textContent = state.selectedOfferings.length;

  // Bind Health Stack Stats
  const hFeast = document.getElementById('health-stat-feast');
  if (hFeast) {
    const isCat = state.selectedOfferings.includes('catering');
    hFeast.textContent = isCat ? `${isGold ? 'Gold (₹1,199/p)' : 'Silver (₹799/p)'} · ${state.catering.dishes.length} Dishes` : 'Not Configured · Add +';
    hFeast.style.color = isCat ? 'var(--color-red)' : '#888';
  }

  const hStall = document.getElementById('health-stat-stall');
  if (hStall) {
    const isStall = state.selectedOfferings.includes('stall');
    hStall.textContent = isStall ? `Active · Fixed (₹${state.stall.fixedPerPlate}/p)` : 'Not Configured · Add +';
    hStall.style.color = isStall ? 'var(--color-black)' : '#888';
  }

  const hBaina = document.getElementById('health-stat-baina');
  if (hBaina) {
    const isBaina = state.selectedOfferings.includes('baina');
    hBaina.textContent = isBaina ? `Active · ${state.baina.boxes.length} Box Sizes` : 'Not Configured · Add +';
    hBaina.style.color = isBaina ? 'var(--color-black)' : '#888';
  }

  const hCounters = document.getElementById('health-stat-counters');
  if (hCounters) {
    const isCounters = state.selectedOfferings.includes('counters');
    hCounters.textContent = isCounters ? `${state.catering.liveCounters.length} Active Counters` : 'Not Configured · Add +';
    hCounters.style.color = isCounters ? 'var(--color-black)' : '#888';
  }

  const hExtras = document.getElementById('health-stat-extras');
  if (hExtras) {
    const isExtras = state.selectedOfferings.includes('extras');
    hExtras.textContent = isExtras ? 'Warmers & Buffets Active' : 'Not Configured · Add +';
    hExtras.style.color = isExtras ? 'var(--color-black)' : '#888';
  }

  const hAddons = document.getElementById('health-stat-addons');
  if (hAddons) {
    const isAddons = state.selectedOfferings.includes('addons');
    hAddons.textContent = isAddons ? 'Welcome Coolers Enabled' : 'Not Configured · Add +';
    hAddons.style.color = isAddons ? 'var(--color-black)' : '#888';
  }

  const hEssentials = document.getElementById('health-stat-essentials');
  if (hEssentials) {
    const isEssentials = state.selectedOfferings.includes('essentials');
    hEssentials.textContent = isEssentials ? 'Stewards & Cutlery (Pkg B)' : 'Not Configured · Add +';
    hEssentials.style.color = isEssentials ? 'var(--color-black)' : '#888';
  }

  // Render Services Hub
  renderServicesHub();
}

function renderServicesHub() {
  const dContainer = document.getElementById('desktop-services-grid-container');
  const mContainer = document.getElementById('mobile-services-list-container');
  if (!dContainer && !mContainer) return;

  const isGold = state.catering.activeTier === 'gold' || state.catering.silverCompleted;

  const servicesData = [
    {
      key: 'catering',
      title: '1. Feast Booking',
      subtitle: 'Multi-course plated buffet catering for grand events',
      icon: '🍲',
      isActive: state.selectedOfferings.includes('catering'),
      activeDetails: [
        { label: 'Active Tier', value: isGold ? 'Gold / Bhoj Signature' : 'Silver / Bhoj City' },
        { label: 'Base Pricing', value: isGold ? `₹${state.catering.tierPrices.gold}/p` : `₹${state.catering.tierPrices.silver}/p` },
        { label: 'Specialization', value: isGold ? state.catering.goldSpecialization : 'None (Base Tier)' },
        { label: 'Published Menu', value: `${state.catering.dishes.length} Items (5 Courses)` },
        { label: 'Platinum Tier', value: '<span class="tier-pill-small" style="background:#E5E7EB;color:#555;">Coming Soon</span>' }
      ],
      unconfiguredNote: 'Offer full-service wedding and gala feast booking with Silver & Gold tiers.',
      editStep: 'view-cat-basics',
      addStep: 'view-offerings'
    },
    {
      key: 'stall',
      title: '2. Single Stall',
      subtitle: 'Dynamic live station for birthdays, fairs & house parties',
      icon: '🎪',
      isActive: state.selectedOfferings.includes('stall'),
      activeDetails: [
        { label: 'Stall Name', value: state.stall.stallName || 'Not Specified (Optional)' },
        { label: 'Menu Format', value: `Fixed Set Spread (₹${state.stall.fixedPerPlate}/p)` },
        { label: 'Min Pax Guarantee', value: `${state.stall.minPaxGuarantee} Guests` },
        { label: 'Specialty Items', value: `${state.stall.delicacies.length} Delicacies Configured` }
      ],
      unconfiguredNote: 'Deploy standalone specialty stalls like Biryani handis or live Sigdi kebabs.',
      editStep: 'view-stall-basics',
      addStep: 'view-offerings'
    },
    {
      key: 'baina',
      title: '3. Baina Boxes',
      subtitle: 'Artisanal sweet gift hampers & invitation boxes',
      icon: '🎁',
      isActive: state.selectedOfferings.includes('baina'),
      activeDetails: [
        { label: 'Studio Name', value: state.baina.studioName },
        { label: 'Packaging Style', value: state.baina.packaging === 'velvet' ? 'Royal Velvet Finish' : (state.baina.packaging === 'gold-foil' ? 'Golden Metallic Foil' : (state.baina.packaging === 'eco-kraft' ? 'Eco Kraft Board' : 'Banarasi Brocade')) },
        { label: 'Min Order Guarantee', value: `${state.baina.minOrderBoxes} Gift Boxes` },
        { label: 'Configured Boxes', value: `${state.baina.boxes.length} Hamper Sizes (½kg & 1kg)` }
      ],
      unconfiguredNote: 'Craft signature mithai and dry-fruit gift boxes for wedding invitation distribution.',
      editStep: 'view-baina-basics',
      addStep: 'view-offerings'
    },
    {
      key: 'counters',
      title: '4. Live Counters',
      subtitle: 'Interactive live cooking stations deployed alongside feasts',
      icon: '🍳',
      isActive: state.selectedOfferings.includes('counters'),
      activeDetails: [
        { label: 'Active Stations', value: 'Chaat Station · Tandoor & Wok · Paan Counter' },
        { label: 'Price Range', value: '₹40 to ₹90 per guest' },
        { label: 'Setup Requirement', value: 'Dedicated 8ft preparation zone' }
      ],
      unconfiguredNote: 'Add interactive Chaat, Tandoori live rolls, or Banarasi Paan live kiosks.',
      editStep: 'view-cat-live',
      addStep: 'view-offerings'
    },
    {
      key: 'extras',
      title: '5. Extras',
      subtitle: 'Equipment rentals, chafing warmers & presentation ware',
      icon: '🪑',
      isActive: state.selectedOfferings.includes('extras'),
      activeDetails: [
        { label: 'Buffet Equipment', value: 'Stainless Chafers & Fuel Warmers' },
        { label: 'Display Linens', value: 'Designer Maroon Banquet Table Skirtings' },
        { label: 'Rental Coverage', value: 'Included for up to 500 guests' }
      ],
      unconfiguredNote: 'Provide buffet warmer gear, chafing dishes, and presentation table setups.',
      editStep: 'view-cat-extras',
      addStep: 'view-offerings'
    },
    {
      key: 'addons',
      title: '6. Add-ons',
      subtitle: 'Welcome coolers, mocktail bar & dessert studios',
      icon: '🍹',
      isActive: state.selectedOfferings.includes('addons'),
      activeDetails: [
        { label: 'Welcome Drinks Bar', value: 'Saffron Kahwa, Aam Panna & Mojitos' },
        { label: 'Late Night Studio', value: 'Hot Kesar Jalebi & Rabri Station' },
        { label: 'Hourly Extension', value: 'Available upon host request' }
      ],
      unconfiguredNote: 'Offer botanical welcome refreshments and specialty midnight dessert stations.',
      editStep: 'view-cat-extras',
      addStep: 'view-offerings'
    },
    {
      key: 'essentials',
      title: '7. Essentials',
      subtitle: 'Uniformed service crew, tableware packages & hygiene',
      icon: '🍽️',
      isActive: state.selectedOfferings.includes('essentials'),
      activeDetails: [
        { label: 'Service Staff', value: 'Uniformed Stewards, Captain & Table Helpers' },
        { label: 'Tableware Tier', value: 'Package B · Ceramic & Stainless Steel (+₹40/p)' },
        { label: 'Waste Management', value: 'Clean disposal team & segregated bins' }
      ],
      unconfiguredNote: 'Provide hospitality stewards, ceramic/fine bone cutlery, and waste clearance.',
      editStep: 'view-cat-extras',
      addStep: 'view-offerings'
    }
  ];

  // Append Custom Offerings (Task 8: Make Vendor Offerings Customizable)
  if (state.customOfferings && state.customOfferings.length > 0) {
    state.customOfferings.forEach((c, idx) => {
      const isSel = state.selectedOfferings.includes(c.id);
      servicesData.push({
        key: c.id,
        title: `${8 + idx}. ${c.title}`,
        subtitle: c.blurb || 'Vendor-defined custom commercial offering',
        icon: c.icon || '✨',
        isActive: isSel,
        activeDetails: [
          { label: 'Offering Scope', value: 'Custom Vendor-Defined Service' },
          { label: 'Listing Status', value: isSel ? 'Active on Catalog' : 'Disabled' }
        ],
        unconfiguredNote: 'Activate this custom service offering for event bookings.',
        editStep: 'view-offerings',
        addStep: 'view-offerings'
      });
    });
  }

  const html = servicesData.map(svc => `
    <div class="service-summary-card ${svc.isActive ? '' : 'unconfigured'}">
      <div class="card-top-header">
        <div class="service-icon-label-group">
          <div class="service-icon-circle">${svc.icon}</div>
          <div>
            <div class="service-title-text">${svc.title}</div>
            <div class="service-sub-type">${svc.subtitle}</div>
          </div>
        </div>
        <span class="service-status-pill ${svc.isActive ? 'active' : 'unconfigured'}">
          ${svc.isActive ? 'Active Service' : 'Not Configured'}
        </span>
      </div>

      <div class="service-body-details">
        ${svc.isActive
          ? svc.activeDetails.map(d => `
              <div class="service-detail-row">
                <span style="color:#777;font-size:11.5px;">${d.label}:</span>
                <strong style="color:var(--color-black);font-size:12px;">${d.value}</strong>
              </div>
            `).join('')
          : `<p style="font-size:12px;color:#777;line-height:1.4;">${svc.unconfiguredNote}</p>`
        }
      </div>

      <div class="service-footer-actions">
        ${svc.isActive
          ? `<button type="button" class="btn-secondary-ghost" style="padding:6px 12px;font-size:11.5px;" onclick="goToStep('${svc.editStep}')">Edit Configuration ✎</button>`
          : `<button type="button" class="btn-primary-action" style="padding:6px 12px;font-size:11.5px;" onclick="goToStep('${svc.addStep}')">+ Enable This Service</button>`
        }
        <span style="font-size:11px;color:#888;">${svc.isActive ? 'Live on Marketplace' : 'Inactive'}</span>
      </div>
    </div>
  `).join('');

  if (dContainer) dContainer.innerHTML = html;
  if (mContainer) mContainer.innerHTML = html;
}

// ── Caterer State Simulator (V1 Feature Preserved) ──
function setCatererDashboardState(mode) {
  currentCatererSimState = mode;

  const select = document.getElementById('caterer-state-select');
  if (select) select.value = mode;

  const urgentCard = document.getElementById('card-urgent-alert');
  const spotlightCard = document.getElementById('card-next-event-spotlight');
  const mobUrgent = document.getElementById('mobile-card-urgent');
  const mobSpotlight = document.getElementById('mobile-card-spotlight');
  const bMarketplace = document.getElementById('badge-marketplace');
  const bStatusText = document.getElementById('banner-status-text');

  if (mode === 'active') {
    if (urgentCard) urgentCard.style.display = 'flex';
    if (spotlightCard) spotlightCard.style.display = 'flex';
    if (mobUrgent) mobUrgent.style.display = 'flex';
    if (mobSpotlight) mobSpotlight.style.display = 'flex';
    if (bMarketplace) {
      bMarketplace.innerHTML = '<span class="status-dot-pulse" style="background:var(--color-red);"></span> Live on Marketplace';
      bMarketplace.className = 'badge-pill badge-outline-maroon';
    }
    if (bStatusText) bStatusText.textContent = 'Your kitchen profile is active and discoverable for feast & stall bookings in Lucknow.';
    showToast('Switched to Active Caterer state (Royal Awadh Caterers)');
  } else if (mode === 'zero') {
    if (urgentCard) urgentCard.style.display = 'none';
    if (mobUrgent) mobUrgent.style.display = 'none';
    if (bMarketplace) {
      bMarketplace.innerHTML = '<span class="status-dot-pulse" style="background:var(--color-red);"></span> Live on Marketplace';
    }
    if (spotlightCard) {
      spotlightCard.innerHTML = `
        <div style="text-align:center; padding: 36px 20px;">
          <div style="font-size:36px; margin-bottom:10px;">🏪</div>
          <h2 style="font-size:20px; font-weight:800; margin-bottom:6px;">Your Kitchen is Open for Bookings!</h2>
          <p style="color:#666; max-width:480px; margin:0 auto; font-size:13px;">Your feast packages and services are published live on the marketplace. As soon as an event host books your services, your kitchen prep brief will appear right here.</p>
        </div>
      `;
    }
    showToast('Switched to Zero Bookings state (Empty state demonstration)');
  } else if (mode === 'kyc') {
    if (urgentCard) {
      urgentCard.style.display = 'flex';
      const heading = document.getElementById('urgent-alert-heading');
      const desc = document.getElementById('urgent-alert-desc');
      if (heading) heading.textContent = 'Action Required: Statutory FSSAI License Document Renewal';
      if (desc) desc.textContent = 'Bhojpatra statutory compliance review found the submitted FSSAI license certificate expired. Upload a valid certificate to retain live marketplace visibility.';
    }
    if (bStatusText) bStatusText.textContent = 'Statutory compliance issue detected. Please re-verify requested documents.';
    showToast('Switched to KYC Action Required state');
  } else if (mode === 'hidden') {
    if (bMarketplace) {
      bMarketplace.innerHTML = '⛔ Storefront Hidden by Admin';
      bMarketplace.className = 'badge-pill badge-solid-maroon';
    }
    if (urgentCard) {
      urgentCard.style.display = 'flex';
      const heading = document.getElementById('urgent-alert-heading');
      const desc = document.getElementById('urgent-alert-desc');
      if (heading) heading.textContent = 'Notice: Listing Temporarily Delisted';
      if (desc) desc.textContent = 'Your partner storefront has been placed on temporary hold. Please contact Bhojpatra Partner Concierge to reactivate discovery.';
    }
    if (bStatusText) bStatusText.textContent = 'Your caterer storefront is temporarily hidden from search results. Contact partner support.';
    showToast('Switched to Listing Hidden state');
  }
}

// ── Modals & Booking Action Handlers ──
function openPrepSheetModal() {
  const modal = document.getElementById('modal-prep-sheet');
  if (modal) modal.classList.add('open');
}

function openBookingReviewModal() {
  const modal = document.getElementById('modal-booking-review');
  if (modal) modal.classList.add('open');
}

function closeDashboardModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

function acceptBooking() {
  closeDashboardModal('modal-booking-review');

  const card = document.getElementById('card-urgent-alert');
  if (card) card.style.display = 'none';

  const mCard = document.getElementById('mobile-card-urgent');
  if (mCard) mCard.style.display = 'none';

  const oCard = document.getElementById('orders-pending-card');
  if (oCard) oCard.style.display = 'none';

  const dot = document.getElementById('desktop-notif-dot');
  if (dot) dot.style.display = 'none';

  const mDot = document.getElementById('mobile-notif-dot');
  if (mDot) mDot.style.display = 'none';

  const badge = document.getElementById('desktop-orders-badge');
  if (badge) badge.style.display = 'none';

  const mBadge = document.getElementById('mobile-bottom-order-badge');
  if (mBadge) mBadge.style.display = 'none';

  showToast('✓ Booking BHOJ-9412 Accepted! Added to Active Pipeline.');
}

function declineBooking() {
  closeDashboardModal('modal-booking-review');

  const card = document.getElementById('card-urgent-alert');
  if (card) card.style.display = 'none';

  const mCard = document.getElementById('mobile-card-urgent');
  if (mCard) mCard.style.display = 'none';

  const oCard = document.getElementById('orders-pending-card');
  if (oCard) oCard.style.display = 'none';

  showToast('Booking request BHOJ-9412 declined.');
}

// ── HTML Escaper Helper ──
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Vendor Direct Sign In Modal (Task 1: Add Sign In to Cutleries/Vendor flow) ──
function openVendorSignInModal() {
  const modal = document.getElementById('modal-vendor-signin');
  if (modal) {
    modal.classList.add('open');
    modal.classList.add('active');
  }
}

function closeVendorSignInModal() {
  const modal = document.getElementById('modal-vendor-signin');
  if (modal) {
    modal.classList.remove('open');
    modal.classList.remove('active');
  }
}

function handleVendorSignIn(e) {
  if (e) e.preventDefault();
  closeVendorSignInModal();

  const credInput = document.getElementById('signin-credential');
  if (credInput && credInput.value) {
    const val = credInput.value.trim();
    if (val.includes('@')) {
      state.account.email = val;
    } else {
      const digits = val.replace(/[^0-9]/g, '').slice(-10);
      if (digits) state.account.phone = digits;
    }
    syncAccountDetailsToUI();
  }

  showToast('✓ Signed in successfully as Royal Awadh Caterers');
  goToStep('view-dashboard');
}

// ── Phase 2 Task 7: Reuse Existing Vendor Signup Details ──
function syncAccountDetailsToUI() {
  if (!state.account) return;

  // Sync to state.details for unified single source of truth
  state.details.ownerName = state.account.name;
  state.details.phone = state.account.phone;
  state.details.email = state.account.email;

  // Desktop verified credentials block
  const dOwner = document.getElementById('d-display-owner');
  const dPhone = document.getElementById('d-display-phone');
  const dEmail = document.getElementById('d-display-email');
  const dAccId = document.getElementById('d-account-id');

  if (dOwner) dOwner.textContent = state.account.name;
  if (dPhone) dPhone.textContent = `+91 ${state.account.phone}`;
  if (dEmail) dEmail.textContent = state.account.email;
  if (dAccId) dAccId.textContent = state.account.id || 'VND-884291';

  // Mobile verified credentials block
  const mOwner = document.getElementById('mob-display-owner');
  const mPhone = document.getElementById('mob-display-phone');
  const mEmail = document.getElementById('mob-display-email');

  if (mOwner) mOwner.textContent = state.account.name;
  if (mPhone) mPhone.textContent = `+91 ${state.account.phone}`;
  if (mEmail) mEmail.textContent = state.account.email;
}

// ── Phase 2 Task 8: Make Vendor Offerings Customizable ──
function addCustomOffering(source = 'desktop') {
  const titleInput = document.getElementById(source === 'mobile' ? 'mobile-custom-offering-title' : 'custom-offering-title');
  const blurbInput = document.getElementById(source === 'mobile' ? 'mobile-custom-offering-blurb' : 'custom-offering-blurb');

  const title = (titleInput ? titleInput.value : '').trim();
  const blurb = (blurbInput ? blurbInput.value : '').trim();

  if (!title) {
    showToast('Please enter an offering name.');
    if (titleInput) titleInput.focus();
    return;
  }

  // Predefined offerings comparison
  const predefinedNames = [
    'feast booking', 'catering', 'single specialty stall', 'stall',
    'baina gifting boxes', 'baina boxes', 'baina', 'live counters', 'counters',
    'extras', 'add-ons', 'addons', 'essentials'
  ];

  if (predefinedNames.includes(title.toLowerCase())) {
    showToast(`"${title}" is already an available standard offering above.`);
    return;
  }

  // Check against existing custom offerings (case-insensitive duplicate check)
  if (!state.customOfferings) state.customOfferings = [];
  const exists = state.customOfferings.some(c => c.title.toLowerCase() === title.toLowerCase());
  if (exists) {
    showToast(`"${title}" has already been added.`);
    return;
  }

  const customId = `custom-${Date.now()}`;
  const newOffering = {
    id: customId,
    title: title,
    blurb: blurb || 'Vendor-defined commercial service offering',
    icon: '✨',
    isCustom: true
  };

  state.customOfferings.push(newOffering);
  if (!state.selectedOfferings.includes(customId)) {
    state.selectedOfferings.push(customId);
  }

  // Clear inputs across both desktop and mobile
  const dTitle = document.getElementById('custom-offering-title');
  const dBlurb = document.getElementById('custom-offering-blurb');
  const mTitle = document.getElementById('mobile-custom-offering-title');
  const mBlurb = document.getElementById('mobile-custom-offering-blurb');

  if (dTitle) dTitle.value = '';
  if (dBlurb) dBlurb.value = '';
  if (mTitle) mTitle.value = '';
  if (mBlurb) mBlurb.value = '';

  renderCustomOfferings();
  updateVendorContextHeader();
  renderServicesHub();
  showToast(`✓ Added custom offering: "${title}"`);
}

function removeCustomOffering(offeringId) {
  if (!state.customOfferings) return;
  const idx = state.customOfferings.findIndex(c => c.id === offeringId);
  if (idx === -1) return;

  const title = state.customOfferings[idx].title;
  state.customOfferings.splice(idx, 1);

  const selIdx = state.selectedOfferings.indexOf(offeringId);
  if (selIdx > -1) {
    state.selectedOfferings.splice(selIdx, 1);
  }

  renderCustomOfferings();
  updateVendorContextHeader();
  renderServicesHub();
  showToast(`Removed custom offering: "${title}"`);
}

function renderCustomOfferings() {
  const dContainer = document.getElementById('desktop-custom-offerings-container');
  const mContainer = document.getElementById('mobile-custom-offerings-container');

  if (!state.customOfferings || state.customOfferings.length === 0) {
    if (dContainer) dContainer.innerHTML = '';
    if (mContainer) mContainer.innerHTML = '';
    return;
  }

  const generateHtml = () => {
    return state.customOfferings.map(c => {
      const isSelected = state.selectedOfferings.includes(c.id);
      return `
        <div class="offering-card custom-offering-card ${isSelected ? 'active' : ''}" data-offering-key="${c.id}" onclick="toggleOffering('${c.id}')">
          <div class="offering-header">
            <span class="offering-icon">${c.icon || '✨'}</span>
            <div style="display:flex; align-items:center; gap:8px;">
              <button type="button" class="btn-remove-custom-offering" onclick="event.stopPropagation(); removeCustomOffering('${c.id}')" title="Remove custom offering">✕</button>
              <div class="offering-checkbox">${isSelected ? '✓' : ''}</div>
            </div>
          </div>
          <div class="offering-title">${escapeHtml(c.title)}</div>
          <div class="offering-blurb">${escapeHtml(c.blurb)}</div>
          <span class="badge" style="background:var(--color-cream-30);color:var(--color-black-80);font-size:11px;align-self:flex-start;">Custom Offering</span>
        </div>
      `;
    }).join('');
  };

  if (dContainer) dContainer.innerHTML = generateHtml();
  if (mContainer) mContainer.innerHTML = generateHtml();
}


