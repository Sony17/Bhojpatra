/**
 * ==========================================================================
 * BHOJPATRA VENDOR REGISTRATION PROTOTYPE — INTERACTION CONTROLLER
 * Full Service Menu Builders (Catering 5A-5F, Stall 6A-6E, Baina 7A-7D)
 * ==========================================================================
 */

// ── Application Mock State (Bhojpatra Data Model) ──
const state = {
  // Navigation & Sequence
  currentStepId: 'view-details',
  stepHistory: [],

  // Selected Service Offerings (Branching keys: 'catering', 'stall', 'baina')
  selectedOfferings: ['catering'], // default demo selection

  // Step 1: Vendor Details
  details: {
    businessName: "Awadhi Royal Caterers",
    ownerName: "Mohammad Zeeshaan",
    phone: "9876543210",
    email: "contact@awadhiroyal.com",
    city: "Lucknow",
    state: "Uttar Pradesh",
    cuisines: ["Awadhi", "Mughlai", "North Indian"],
    googleRating: "4.8",
    googleReviews: "142",
  },

  // Step 2: Basic Info & Operations
  basic: {
    minGuests: 50,
    maxGuests: 1500,
    maxEventsPerDay: 3,
    serviceCities: ["Lucknow", "Kanpur", "Ayodhya"],
    leadTimeHours: 48,
  },

  // Step 3: KYC & Compliance
  kyc: {
    gstNumber: "09AAACA1234A1Z5",
    fssaiNumber: "12723055000123",
    docs: {
      gst: { uploaded: true, filename: "gst_certificate_2026.pdf" },
      fssai: { uploaded: true, filename: "fssai_licence_awadh.pdf" },
      ownerId: { uploaded: true, filename: "owner_pan_card.jpg" },
      businessProof: { uploaded: true, filename: "shop_act_licence.pdf" }
    }
  },

  // Step 5: Catering Builder (5A to 5F)
  catering: {
    // 5A. Feast Basics
    feastName: "Royal Awadhi Dastarkhwan",
    description: "Heritage royal multi-course feast inspired by Nawabi culinary traditions.",
    cuisineContext: "Awadhi & Mughlai",
    
    // 5B. Platform Courses
    courses: [
      { id: "welcome", name: "Welcome Drinks", icon: "🍹" },
      { id: "starters", name: "Starters & Kebabs", icon: "🍢" },
      { id: "main", name: "Main Course", icon: "🍲" },
      { id: "breads-rice", name: "Breads & Rice", icon: "🍚" },
      { id: "desserts", name: "Desserts & Mithai", icon: "🍨" },
      { id: "accompaniments", name: "Accompaniments", icon: "🥗" }
    ],
    activeCourseTab: "starters",

    // 5C. Granular Dish Catalog
    dishes: [
      { id: "d1", name: "Paneer Tikka Angara", course: "starters", diet: "veg", desc: "Charcoal grilled cottage cheese marinated in spiced hung curd.", tiers: ["Silver", "Gold", "Platinum"] },
      { id: "d2", name: "Galouti Kebab", course: "starters", diet: "non-veg", desc: "Melt-in-mouth smoked lamb patties infused with potli masala.", tiers: ["Gold", "Platinum"] },
      { id: "d3", name: "Dahi ke Kebab", course: "starters", diet: "veg", desc: "Crisp hung curd patties with cardamom and fresh mint.", tiers: ["Platinum"] },
      { id: "d4", name: "Murg Malai Tikka", course: "starters", diet: "non-veg", desc: "Tender chicken chunks glazed in cream and royal spices.", tiers: ["Gold", "Platinum"] },
      { id: "d5", name: "Kashmiri Kahwa", course: "welcome", diet: "veg", desc: "Green tea with saffron strands and sliced almonds.", tiers: ["Silver", "Gold", "Platinum"] },
      { id: "d6", name: "Rose Sherbet with Basil", course: "welcome", diet: "veg", desc: "Chilled rose essence drink with soaked sabja seeds.", tiers: ["Gold", "Platinum"] },
      { id: "d7", name: "Awadhi Dum Biryani", course: "main", diet: "non-veg", desc: "Long-grain basmati rice slow-cooked on charcoal dum.", tiers: ["Silver", "Gold", "Platinum"] },
      { id: "d8", name: "Paneer Lababdar", course: "main", diet: "veg", desc: "Rich cottage cheese in tomato and grated paneer gravy.", tiers: ["Silver", "Gold", "Platinum"] },
      { id: "d9", name: "Dal Makhani", course: "main", diet: "veg", desc: "Black lentils slow-cooked overnight with churned white butter.", tiers: ["Silver", "Gold", "Platinum"] },
      { id: "d10", name: "Ulte Tawe ka Paratha", course: "breads-rice", diet: "veg", desc: "Delicate saffron-brushed flatbread baked on inverted griddle.", tiers: ["Silver", "Gold", "Platinum"] },
      { id: "d11", name: "Sheermal", course: "breads-rice", diet: "veg", desc: "Traditional sweet saffron-flavored tandoori naan.", tiers: ["Gold", "Platinum"] },
      { id: "d12", name: "Shahi Tukda with Rabri", course: "desserts", diet: "veg", desc: "Crisp ghee-fried bread steeped in saffron syrup with thick rabri.", tiers: ["Silver", "Gold", "Platinum"] },
      { id: "d13", name: "Gulab Jamun with Pista", course: "desserts", diet: "veg", desc: "Soft khoya dumplings in rose-scented cardamom syrup.", tiers: ["Gold", "Platinum"] }
    ],

    // 5D. Tier Quotas & Pricing
    tierPrices: {
      silver: 799,
      gold: 1199,
      platinum: 1699
    },
    tierQuotas: {
      silver: { welcome: 1, starters: 2, main: 3, "breads-rice": 2, desserts: 1 },
      gold: { welcome: 2, starters: 4, main: 4, "breads-rice": 3, desserts: 2 },
      platinum: { welcome: 3, starters: 6, main: 5, "breads-rice": 4, desserts: 3 }
    },

    // 5E. Live Food Counters & Essential Services
    liveCounters: ["Pan Counter", "Chaat Station", "Live Tandoor"],
    availableCounters: [
      { name: "Pan Counter", rate: 40 },
      { name: "Chaat Station", rate: 60 },
      { name: "Live Tandoor", rate: 90 },
      { name: "Pizza Counter", rate: 120 },
      { name: "Chinese Wok", rate: 85 },
      { name: "Dessert Studio", rate: 70 }
    ],
    essentialServices: {
      serviceStaff: true,
      cleaningHygiene: true,
      wasteManagement: true
    }
  },

  // Step 6: Stall Builder (6A to 6E)
  stall: {
    stallName: "Awadhi Dum Biryani & Galouti Corner",
    specialty: "Mughlai & Tandoor Station",
    description: "Authentic charcoal-dum service station catering live kebabs and dum biryani.",
    menuType: "fixed", // 'fixed' | 'varied'
    fixedPerPlate: 280,
    minPaxGuarantee: 50,
    delicacies: [
      { id: "del-1", name: "Chicken Dum Biryani (Degchi)", diet: "non-veg", price: 220, desc: "Aromatic basmati rice cooked on dum in sealed handis." },
      { id: "del-2", name: "Mutton Galouti Kebab (2 pcs + Paratha)", diet: "non-veg", price: 260, desc: "Melt-in-mouth kebabs served with flaky Mughlai paratha." },
      { id: "del-3", name: "Paneer Tikka Platter", diet: "veg", price: 190, desc: "Smoky tandoori paneer skewers with spiced bell peppers." },
      { id: "del-4", name: "Burani Garlic Raita", diet: "veg", price: 40, desc: "Creamy curd infused with roasted garlic and cumin." }
    ]
  },

  // Step 7: Baina Builder (7A to 7D)
  baina: {
    studioName: "Ram Asrey Royal Baina & Mithai Studio",
    description: "Generations-old confectionery crafting artisanal sweet hampers and custom wedding invitation boxes.",
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
        photo: "royal_box.jpg"
      },
      {
        id: "b2",
        name: "Dry Fruit Invitation Box",
        contents: "Californian Almonds, Kashmiri Walnuts, Afghan Raisins, Salted Pistachios",
        priceHalfKg: 750,
        priceOneKg: 1400,
        customSizes: [{ label: "500g", price: 750 }],
        photo: "dryfruit_box.jpg"
      }
    ]
  },

  // Editing state for modals
  editingDishId: null,
  editingDelicacyId: null,
  editingBoxId: null
};

// ── Dynamic Flow Generator (Sequential Sub-Step Architecture) ──
function getActiveFlowSteps() {
  const baseSteps = [
    { id: 'view-details', title: 'Vendor Details', label: '1. Details' },
    { id: 'view-basic', title: 'Basic Info & Coverage', label: '2. Basic Info' },
    { id: 'view-kyc', title: 'KYC & Documents', label: '3. KYC' },
    { id: 'view-offerings', title: 'Service Offering', label: '4. Offerings' },
  ];

  const configSteps = [];

  // 1. Catering Sub-Step Chain
  if (state.selectedOfferings.includes('catering')) {
    configSteps.push(
      { id: 'view-cat-basics', title: 'Feast Basics', label: '5A. Basics', group: 'catering' },
      { id: 'view-cat-courses', title: 'Course Hierarchy', label: '5B. Courses', group: 'catering' },
      { id: 'view-cat-dishes', title: 'Dish Catalog', label: '5C. Dishes', group: 'catering' },
      { id: 'view-cat-tiers', title: 'Tier Configuration', label: '5D. Tiers', group: 'catering' },
      { id: 'view-cat-extras', title: 'Live Counters & Services', label: '5E. Extras', group: 'catering' },
      { id: 'view-cat-review', title: 'Catering Review', label: '5F. Cat Review', group: 'catering' }
    );
  }

  // 2. Stall Sub-Step Chain
  if (state.selectedOfferings.includes('stall')) {
    configSteps.push(
      { id: 'view-stall-basics', title: 'Stall Basics', label: '6A. Stall', group: 'stall' },
      { id: 'view-stall-format', title: 'Menu Format', label: '6B. Format', group: 'stall' },
      { id: 'view-stall-items', title: 'Delicacies', label: '6C. Items', group: 'stall' },
      { id: 'view-stall-pricing', title: 'Pricing & Pax', label: '6D. Pricing', group: 'stall' },
      { id: 'view-stall-review', title: 'Stall Review', label: '6E. Stall Rev', group: 'stall' }
    );
  }

  // 3. Baina Sub-Step Chain
  if (state.selectedOfferings.includes('baina')) {
    configSteps.push(
      { id: 'view-baina-basics', title: 'Gifting Basics', label: '7A. Gifting', group: 'baina' },
      { id: 'view-baina-boxes', title: 'Box Catalog', label: '7B. Boxes', group: 'baina' },
      { id: 'view-baina-packaging', title: 'Packaging Styles', label: '7C. Packaging', group: 'baina' },
      { id: 'view-baina-review', title: 'Baina Review', label: '7D. Baina Rev', group: 'baina' }
    );
  }

  // Fallback if none selected
  if (configSteps.length === 0) {
    configSteps.push({ id: 'view-cat-basics', title: 'Feast Basics', label: '5A. Basics', group: 'catering' });
  }

  const endingSteps = [
    { id: 'view-review', title: 'Review & Submit', label: '08. Review' },
    { id: 'view-complete', title: 'Registration Complete', label: '09. Complete' },
  ];

  return [...baseSteps, ...configSteps, ...endingSteps];
}

// ── DOM Initialization ──
document.addEventListener('DOMContentLoaded', () => {
  initStepper();
  bindFormInputs();
  bindOfferingCards();
  bindDocUploaders();
  bindStallMenuType();
  bindPackagingCards();
  bindModalEvents();
  renderCourseTabs();
  renderCateringDishes();
  renderCourseManageList();
  renderTierMatrix();
  renderStallDelicacies();
  renderBainaBoxes();
  updateStepperUI();
  populateReviewScreen();
});

// ── View Navigation ──
function goToStep(targetStepId) {
  const steps = getActiveFlowSteps();
  const valid = steps.some(s => s.id === targetStepId);
  if (!valid) return;

  // Record history
  if (state.currentStepId !== targetStepId) {
    state.stepHistory.push(state.currentStepId);
  }

  state.currentStepId = targetStepId;

  // Toggle step view elements in both frames
  document.querySelectorAll('.step-container').forEach(el => {
    el.classList.remove('active');
  });

  const activeElements = document.querySelectorAll(`[data-step-id="${targetStepId}"]`);
  activeElements.forEach(el => el.classList.add('active'));

  // Update stepper & subnav
  updateStepperUI();
  updateSubnavBar();

  // Scroll wizard body to top
  document.querySelectorAll('.wizard-body').forEach(b => {
    b.scrollTop = 0;
  });

  // Re-render views if target is dynamic
  if (targetStepId === 'view-cat-dishes') {
    renderCourseTabs();
    renderCateringDishes();
  } else if (targetStepId === 'view-cat-courses') {
    renderCourseManageList();
  } else if (targetStepId === 'view-cat-tiers') {
    renderTierMatrix();
  } else if (targetStepId === 'view-cat-review') {
    renderCateringReview();
  } else if (targetStepId === 'view-stall-items') {
    renderStallDelicacies();
  } else if (targetStepId === 'view-stall-review') {
    renderStallReview();
  } else if (targetStepId === 'view-baina-boxes') {
    renderBainaBoxes();
  } else if (targetStepId === 'view-baina-review') {
    renderBainaReview();
  } else if (targetStepId === 'view-review') {
    populateReviewScreen();
  }

  // Sync quick-jump dropdown in top prototype bar
  const quickJumpSelect = document.getElementById('prototype-step-jump');
  if (quickJumpSelect) {
    quickJumpSelect.value = targetStepId;
  }
}

function nextStep() {
  const steps = getActiveFlowSteps();
  const currentIndex = steps.findIndex(s => s.id === state.currentStepId);
  if (currentIndex < steps.length - 1) {
    goToStep(steps[currentIndex + 1].id);
  }
}

function prevStep() {
  const steps = getActiveFlowSteps();
  const currentIndex = steps.findIndex(s => s.id === state.currentStepId);
  if (currentIndex > 0) {
    goToStep(steps[currentIndex - 1].id);
  }
}

// ── Stepper UI Synchronizer ──
function initStepper() {
  renderStepperBar('desktop-stepper-track');
  renderStepperBar('mobile-stepper-track');
}

function renderStepperBar(trackId) {
  const track = document.getElementById(trackId);
  if (!track) return;

  const steps = getActiveFlowSteps();
  track.innerHTML = '';

  // Create consolidated main steps for high-level progress bar:
  // Details -> Basic Info -> KYC -> Offerings -> [Active Service Setup] -> Review
  const mainPhaseSteps = [
    { id: 'view-details', label: '1. Details', matches: ['view-details'] },
    { id: 'view-basic', label: '2. Basic Info', matches: ['view-basic'] },
    { id: 'view-kyc', label: '3. KYC', matches: ['view-kyc'] },
    { id: 'view-offerings', label: '4. Offerings', matches: ['view-offerings'] },
  ];

  if (state.selectedOfferings.includes('catering')) {
    mainPhaseSteps.push({
      id: 'view-cat-basics',
      label: '5. Catering',
      matches: ['view-cat-basics', 'view-cat-courses', 'view-cat-dishes', 'view-cat-tiers', 'view-cat-extras', 'view-cat-review']
    });
  }
  if (state.selectedOfferings.includes('stall')) {
    mainPhaseSteps.push({
      id: 'view-stall-basics',
      label: '6. Stall',
      matches: ['view-stall-basics', 'view-stall-format', 'view-stall-items', 'view-stall-pricing', 'view-stall-review']
    });
  }
  if (state.selectedOfferings.includes('baina')) {
    mainPhaseSteps.push({
      id: 'view-baina-basics',
      label: '7. Baina',
      matches: ['view-baina-basics', 'view-baina-boxes', 'view-baina-packaging', 'view-baina-review']
    });
  }

  mainPhaseSteps.push({ id: 'view-review', label: 'Review', matches: ['view-review'] });

  mainPhaseSteps.forEach((phase, index) => {
    const isCurrentActive = phase.matches.includes(state.currentStepId);
    const item = document.createElement('div');
    item.className = `step-item ${isCurrentActive ? 'active' : ''}`;
    item.onclick = () => goToStep(phase.id);

    item.innerHTML = `
      <div class="step-circle">${index + 1}</div>
      <span class="step-title">${phase.label}</span>
    `;

    track.appendChild(item);

    if (index < mainPhaseSteps.length - 1) {
      const divider = document.createElement('div');
      divider.className = 'step-divider';
      track.appendChild(divider);
    }
  });
}

function updateStepperUI() {
  const steps = getActiveFlowSteps();
  const currentIndex = steps.findIndex(s => s.id === state.currentStepId);

  // Update top stepper tracks
  const mainPhaseSteps = [
    { matches: ['view-details'] },
    { matches: ['view-basic'] },
    { matches: ['view-kyc'] },
    { matches: ['view-offerings'] },
  ];
  if (state.selectedOfferings.includes('catering')) {
    mainPhaseSteps.push({ matches: ['view-cat-basics', 'view-cat-courses', 'view-cat-dishes', 'view-cat-tiers', 'view-cat-extras', 'view-cat-review'] });
  }
  if (state.selectedOfferings.includes('stall')) {
    mainPhaseSteps.push({ matches: ['view-stall-basics', 'view-stall-format', 'view-stall-items', 'view-stall-pricing', 'view-stall-review'] });
  }
  if (state.selectedOfferings.includes('baina')) {
    mainPhaseSteps.push({ matches: ['view-baina-basics', 'view-baina-boxes', 'view-baina-packaging', 'view-baina-review'] });
  }
  mainPhaseSteps.push({ matches: ['view-review'] });

  const activePhaseIndex = mainPhaseSteps.findIndex(p => p.matches.includes(state.currentStepId));

  document.querySelectorAll('.stepper-track').forEach(track => {
    const items = track.querySelectorAll('.step-item');
    items.forEach((item, index) => {
      item.classList.remove('active', 'completed');
      if (index === activePhaseIndex) {
        item.classList.add('active');
        const circle = item.querySelector('.step-circle');
        if (circle) circle.textContent = index + 1;
      } else if (index < activePhaseIndex) {
        item.classList.add('completed');
        const circle = item.querySelector('.step-circle');
        if (circle) circle.textContent = '✓';
      } else {
        const circle = item.querySelector('.step-circle');
        if (circle) circle.textContent = index + 1;
      }
    });
  });

  // Update Next button label
  document.querySelectorAll('.btn-next-step').forEach(btn => {
    if (state.currentStepId === 'view-offerings') {
      const branchNames = state.selectedOfferings.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' & ');
      btn.innerHTML = `Continue to ${branchNames || 'Service'} Setup →`;
    } else if (state.currentStepId === 'view-review') {
      btn.innerHTML = `Submit Application & Go to Dashboard ✓`;
    } else if (state.currentStepId === 'view-complete') {
      btn.style.display = 'none';
    } else {
      btn.innerHTML = `Save & Continue →`;
      btn.style.display = 'inline-flex';
    }
  });

  // Update Back button visibility
  document.querySelectorAll('.btn-prev-step').forEach(btn => {
    if (currentIndex === 0 || state.currentStepId === 'view-complete') {
      btn.style.visibility = 'hidden';
    } else {
      btn.style.visibility = 'visible';
    }
  });
}

// ── Subnav Breadcrumb Bar for Service Builders ──
function updateSubnavBar() {
  document.querySelectorAll('.builder-subnav-bar').forEach(bar => {
    const group = bar.getAttribute('data-subnav-group');
    if (!group) return;

    // Is current step in this group?
    const isCurrentInGroup = state.currentStepId.startsWith(`view-${group === 'catering' ? 'cat' : group}`);
    bar.style.display = isCurrentInGroup ? 'flex' : 'none';

    if (isCurrentInGroup) {
      const pills = bar.querySelectorAll('.subnav-pill');
      let passedCurrent = false;

      pills.forEach(pill => {
        const targetId = pill.getAttribute('data-target-step');
        pill.classList.remove('active', 'completed');

        if (targetId === state.currentStepId) {
          pill.classList.add('active');
          passedCurrent = true;
        } else if (!passedCurrent) {
          pill.classList.add('completed');
        }
      });
    }
  });
}

// ── Offering Selection Logic (What do you offer?) ──
function bindOfferingCards() {
  document.querySelectorAll('.service-card-select').forEach(card => {
    card.addEventListener('click', () => {
      const offeringKey = card.getAttribute('data-offering');
      toggleOffering(offeringKey);
    });
  });
}

function toggleOffering(key) {
  if (state.selectedOfferings.includes(key)) {
    if (state.selectedOfferings.length === 1) {
      showToast("Please keep at least one service selected.");
      return;
    }
    state.selectedOfferings = state.selectedOfferings.filter(o => o !== key);
  } else {
    state.selectedOfferings.push(key);
  }

  // Update visual selected state on cards in both frames
  document.querySelectorAll('.service-card-select').forEach(card => {
    const cardKey = card.getAttribute('data-offering');
    const isSelected = state.selectedOfferings.includes(cardKey);
    card.classList.toggle('selected', isSelected);
    const indicator = card.querySelector('.service-checkbox-indicator');
    if (indicator) {
      indicator.textContent = isSelected ? '✓' : '';
    }
  });

  // Refresh stepper bar to reflect new sequence
  initStepper();
  updateStepperUI();
  updateSubnavBar();
}

// ── Bind Form Inputs to State ──
function bindFormInputs() {
  // Generic text & select bindings
  document.querySelectorAll('input[data-bind], select[data-bind], textarea[data-bind]').forEach(input => {
    const bindPath = input.getAttribute('data-bind').split('.');
    input.addEventListener('input', (e) => {
      if (bindPath.length === 2) {
        state[bindPath[0]][bindPath[1]] = e.target.value;
      }
    });
  });

  // Cuisine Chip Toggles
  document.querySelectorAll('.chip[data-cuisine]').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.getAttribute('data-cuisine');
      toggleArrayItem(state.details.cuisines, val);
      chip.classList.toggle('selected', state.details.cuisines.includes(val));
    });
  });

  // Service Cities Chip Toggles
  document.querySelectorAll('.chip[data-city]').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.getAttribute('data-city');
      toggleArrayItem(state.basic.serviceCities, val);
      chip.classList.toggle('selected', state.basic.serviceCities.includes(val));
    });
  });

  // Live Counters Chip Toggles (5E)
  document.querySelectorAll('.chip[data-live-counter]').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.getAttribute('data-live-counter');
      toggleArrayItem(state.catering.liveCounters, val);
      chip.classList.toggle('selected', state.catering.liveCounters.includes(val));
    });
  });

  // Custom Cuisine Adder
  document.querySelectorAll('.btn-add-custom-cuisine').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input && input.value.trim()) {
        const val = input.value.trim();
        if (!state.details.cuisines.includes(val)) {
          state.details.cuisines.push(val);
          createChip(val, 'cuisine', btn.closest('.chip-group'));
          input.value = '';
          showToast(`Added speciality "${val}"`);
        }
      }
    });
  });

  // Custom City Adder
  document.querySelectorAll('.btn-add-custom-city').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input && input.value.trim()) {
        const val = input.value.trim();
        if (!state.basic.serviceCities.includes(val)) {
          state.basic.serviceCities.push(val);
          createChip(val, 'city', btn.closest('.chip-group'));
          input.value = '';
          showToast(`Added serviceable city "${val}"`);
        }
      }
    });
  });
}

function toggleArrayItem(arr, item) {
  const index = arr.indexOf(item);
  if (index > -1) {
    arr.splice(index, 1);
  } else {
    arr.push(item);
  }
}

function createChip(label, type, container) {
  const chip = document.createElement('div');
  chip.className = 'chip selected';
  chip.setAttribute(`data-${type}`, label);
  chip.textContent = label;
  chip.addEventListener('click', () => {
    const arr = type === 'cuisine' ? state.details.cuisines : state.basic.serviceCities;
    toggleArrayItem(arr, label);
    chip.classList.toggle('selected', arr.includes(label));
  });
  container.insertBefore(chip, container.querySelector('.chip-custom-adder'));
}

// ── KYC Document Upload Simulation ──
function bindDocUploaders() {
  document.querySelectorAll('.doc-upload-card').forEach(card => {
    card.addEventListener('click', () => {
      const docKey = card.getAttribute('data-doc-key');
      simulateDocUpload(card, docKey);
    });
  });
}

function simulateDocUpload(card, docKey) {
  const glyph = card.querySelector('.doc-icon-glyph');
  const title = card.querySelector('.doc-title-text');
  const hint = card.querySelector('.doc-hint-text');

  glyph.textContent = '…';
  hint.textContent = 'Uploading to secure vault…';

  setTimeout(() => {
    glyph.textContent = '✓';
    card.classList.add('uploaded');
    const filename = `${docKey}_verified_doc.pdf`;
    state.kyc.docs[docKey] = { uploaded: true, filename };

    hint.innerHTML = `<span class="doc-uploaded-badge">✓ ${filename}</span>`;
    showToast(`Uploaded ${title.textContent} successfully`);
  }, 600);
}

// ==========================================================================
// CATERING BUILDER CONTROLLERS (5A - 5F)
// ==========================================================================

// ── 5B. Course List Management ──
function renderCourseManageList() {
  document.querySelectorAll('.course-manage-list-container').forEach(container => {
    container.innerHTML = '';
    state.catering.courses.forEach((course, idx) => {
      const dishCount = state.catering.dishes.filter(d => d.course === course.id).length;
      const row = document.createElement('div');
      row.className = 'course-manage-row';
      row.innerHTML = `
        <div class="course-manage-left">
          <span class="course-drag-handle">☰</span>
          <span class="course-row-icon">${course.icon}</span>
          <div>
            <div class="course-row-title">${course.name}</div>
            <div class="course-row-dishes">${dishCount} dishes configured</div>
          </div>
        </div>
        <div class="course-manage-actions">
          <button type="button" class="btn-dish-action" onclick="openCourseDishes('${course.id}')">View Dishes →</button>
          <button type="button" class="btn-dish-action" onclick="renameCoursePrompt('${course.id}')">Rename</button>
        </div>
      `;
      container.appendChild(row);
    });
  });
}

function openCourseDishes(courseId) {
  state.catering.activeCourseTab = courseId;
  goToStep('view-cat-dishes');
}

function renameCoursePrompt(courseId) {
  const course = state.catering.courses.find(c => c.id === courseId);
  if (!course) return;
  const newName = prompt(`Rename course "${course.name}":`, course.name);
  if (newName && newName.trim()) {
    course.name = newName.trim();
    renderCourseManageList();
    renderCourseTabs();
    showToast(`Renamed course to "${newName.trim()}"`);
  }
}

function addNewCoursePrompt() {
  const courseName = prompt("Enter new course name (e.g. Chaat & Live Counters, Beverages):");
  if (courseName && courseName.trim()) {
    const slug = courseName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    state.catering.courses.push({
      id: slug,
      name: courseName.trim(),
      icon: "🍽️"
    });
    renderCourseManageList();
    renderCourseTabs();
    showToast(`Added course "${courseName.trim()}"`);
  }
}

// ── 5C. Course Tabs & Dish Catalog ──
function renderCourseTabs() {
  document.querySelectorAll('.course-tabs-nav-container').forEach(container => {
    container.innerHTML = '';
    state.catering.courses.forEach(course => {
      const dishCount = state.catering.dishes.filter(d => d.course === course.id).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `course-tab-btn ${course.id === state.catering.activeCourseTab ? 'active' : ''}`;
      btn.onclick = () => {
        state.catering.activeCourseTab = course.id;
        renderCourseTabs();
        renderCateringDishes();
      };
      btn.innerHTML = `
        <span>${course.icon}</span>
        <span>${course.name}</span>
        <span class="course-count-badge">${dishCount}</span>
      `;
      container.appendChild(btn);
    });
  });
}

function renderCateringDishes() {
  const filteredDishes = state.catering.dishes.filter(d => d.course === state.catering.activeCourseTab);
  const activeCourseObj = state.catering.courses.find(c => c.id === state.catering.activeCourseTab);

  document.querySelectorAll('.dish-list-container').forEach(container => {
    container.innerHTML = '';

    if (filteredDishes.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div style="font-size: 28px;">🍲</div>
          <div style="font-weight: 700; color: var(--color-black);">No dishes in ${activeCourseObj ? activeCourseObj.name : 'this course'} yet</div>
          <div>Click "+ Add Dish" below to add your first delicacy to this course.</div>
        </div>
      `;
      return;
    }

    filteredDishes.forEach(dish => {
      const card = document.createElement('div');
      card.className = 'dish-card';
      const tierTagsHtml = dish.tiers.map(t => `<span class="dish-tier-tag ${t.toLowerCase()}">${t}</span>`).join(' ');
      
      card.innerHTML = `
        <div class="dish-main-info">
          <div class="dish-name-row">
            <span class="dish-diet-icon ${dish.diet === 'non-veg' ? 'non-veg' : ''}" title="${dish.diet}"></span>
            <span class="dish-name-text">${dish.name}</span>
          </div>
          <div class="dish-desc-text">${dish.desc || 'Signature recipe crafted with traditional spices.'}</div>
          <div class="dish-tiers-row">
            <span style="font-size: 11px; color: #777; font-weight: 600;">Available in:</span>
            ${tierTagsHtml}
          </div>
        </div>
        <div class="dish-actions">
          <button type="button" class="btn-dish-action" onclick="openDishModal('${dish.id}')">Edit</button>
          <button type="button" class="btn-dish-action delete" onclick="deleteDish('${dish.id}')">Remove</button>
        </div>
      `;
      container.appendChild(card);
    });
  });
}

// ── 5D. Tier Configuration (Quotas & Matrix) ──
function renderTierMatrix() {
  // Sync Silver, Gold, Platinum pricing inputs
  const sInput = document.getElementById('tier-price-silver');
  if (sInput) sInput.value = state.catering.tierPrices.silver;
  const gInput = document.getElementById('tier-price-gold');
  if (gInput) gInput.value = state.catering.tierPrices.gold;
  const pInput = document.getElementById('tier-price-platinum');
  if (pInput) pInput.value = state.catering.tierPrices.platinum;

  // Render Quota Steppers
  ['silver', 'gold', 'platinum'].forEach(tierKey => {
    const quotaContainer = document.getElementById(`quotas-${tierKey}`);
    if (!quotaContainer) return;

    quotaContainer.innerHTML = '';
    state.catering.courses.forEach(course => {
      const currentQuota = (state.catering.tierQuotas[tierKey] && state.catering.tierQuotas[tierKey][course.id]) || 0;
      const row = document.createElement('div');
      row.className = 'quota-item-row';
      row.innerHTML = `
        <span>${course.icon} ${course.name}</span>
        <div class="quota-stepper">
          <button type="button" class="btn-quota-step" onclick="stepQuota('${tierKey}', '${course.id}', -1)">−</button>
          <span class="quota-val-num">${currentQuota}</span>
          <button type="button" class="btn-quota-step" onclick="stepQuota('${tierKey}', '${course.id}', 1)">+</button>
        </div>
      `;
      quotaContainer.appendChild(row);
    });
  });
}

function stepQuota(tierKey, courseId, delta) {
  if (!state.catering.tierQuotas[tierKey]) {
    state.catering.tierQuotas[tierKey] = {};
  }
  const curr = state.catering.tierQuotas[tierKey][courseId] || 0;
  const newVal = Math.max(0, curr + delta);
  state.catering.tierQuotas[tierKey][courseId] = newVal;
  renderTierMatrix();
}

function updateTierPrice(tierKey, val) {
  state.catering.tierPrices[tierKey] = Number(val);
}

// ── 5F. Catering Review ──
function renderCateringReview() {
  const c = state.catering;
  const revFeastName = document.getElementById('cat-rev-feast-name');
  if (revFeastName) revFeastName.textContent = c.feastName;

  const revFeastDesc = document.getElementById('cat-rev-feast-desc');
  if (revFeastDesc) revFeastDesc.textContent = c.description;

  const revTiers = document.getElementById('cat-rev-tiers');
  if (revTiers) {
    revTiers.textContent = `Silver: ₹${c.tierPrices.silver}/plate · Gold: ₹${c.tierPrices.gold}/plate · Platinum: ₹${c.tierPrices.platinum}/plate`;
  }

  const revCourses = document.getElementById('cat-rev-courses');
  if (revCourses) {
    revCourses.textContent = `${c.courses.length} courses (${c.courses.map(co => co.name).join(', ')})`;
  }

  const revDishes = document.getElementById('cat-rev-dishes');
  if (revDishes) {
    revDishes.textContent = `${c.dishes.length} individual delicacies configured across courses.`;
  }

  const revDishesList = document.getElementById('cat-rev-dishes-sample-list');
  if (revDishesList) {
    revDishesList.innerHTML = c.dishes.slice(0, 8).map(d => `
      <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; background: #FFFDF9; border: 1px solid var(--color-cream-30); padding: 4px 8px; border-radius: 6px;">
        <span class="dish-diet-icon ${d.diet === 'non-veg' ? 'non-veg' : ''}"></span>
        <span>${d.name} (${d.tiers.join(', ')})</span>
      </div>
    `).join(' ');
  }

  const revCounters = document.getElementById('cat-rev-counters');
  if (revCounters) {
    revCounters.textContent = c.liveCounters.join(', ') || 'None selected';
  }
}

// ==========================================================================
// STALL BUILDER CONTROLLERS (6A - 6E)
// ==========================================================================

function bindStallMenuType() {
  document.querySelectorAll('.segmented-btn[data-stall-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-stall-type');
      state.stall.menuType = type;

      document.querySelectorAll('.segmented-btn[data-stall-type]').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-stall-type') === type);
      });

      // Toggle display of fixed vs varied inputs
      document.querySelectorAll('.stall-fixed-panel').forEach(p => {
        p.style.display = type === 'fixed' ? 'block' : 'none';
      });
      document.querySelectorAll('.stall-varied-panel').forEach(p => {
        p.style.display = type === 'varied' ? 'block' : 'none';
      });
    });
  });
}

function renderStallDelicacies() {
  document.querySelectorAll('.delicacy-list-container').forEach(container => {
    container.innerHTML = '';
    state.stall.delicacies.forEach(item => {
      const card = document.createElement('div');
      card.className = 'delicacy-card';
      card.innerHTML = `
        <div class="delicacy-info">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="dish-diet-icon ${item.diet === 'non-veg' ? 'non-veg' : ''}"></span>
            <strong style="font-size: 15px;">${item.name}</strong>
          </div>
          <div style="font-size: 12px; color: #666;">${item.desc || ''}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 14px;">
          <span class="delicacy-price-tag">₹${item.price}</span>
          <div class="dish-actions">
            <button type="button" class="btn-dish-action" onclick="openDelicacyModal('${item.id}')">Edit</button>
            <button type="button" class="btn-dish-action delete" onclick="deleteDelicacy('${item.id}')">Remove</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  });
}

function renderStallReview() {
  const s = state.stall;
  const revName = document.getElementById('stall-rev-name');
  if (revName) revName.textContent = `${s.stallName} (${s.specialty})`;

  const revFormat = document.getElementById('stall-rev-format');
  if (revFormat) {
    revFormat.textContent = s.menuType === 'fixed' 
      ? `Fixed Set Spread (₹${s.fixedPerPlate}/plate) · Min Guarantee: ${s.minPaxGuarantee} pax`
      : `Varied Build-Your-Own (Guest picks individual delicacies) · Min Guarantee: ${s.minPaxGuarantee} pax`;
  }

  const revItems = document.getElementById('stall-rev-items');
  if (revItems) {
    revItems.textContent = `${s.delicacies.length} delicacies (${s.delicacies.map(d => `${d.name} - ₹${d.price}`).join('; ')})`;
  }
}

// ==========================================================================
// BAINA BUILDER CONTROLLERS (7A - 7D)
// ==========================================================================

function bindPackagingCards() {
  document.querySelectorAll('.packaging-card[data-packaging]').forEach(card => {
    card.addEventListener('click', () => {
      const pkg = card.getAttribute('data-packaging');
      state.baina.packaging = pkg;

      document.querySelectorAll('.packaging-card[data-packaging]').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-packaging') === pkg);
      });
      showToast(`Selected packaging style: ${pkg}`);
    });
  });
}

function renderBainaBoxes() {
  document.querySelectorAll('.baina-box-list-container').forEach(container => {
    container.innerHTML = '';
    state.baina.boxes.forEach(box => {
      const card = document.createElement('div');
      card.className = 'baina-box-item-card';

      const customSizesHtml = (box.customSizes || []).map(s => `<span class="size-pill">${s.label}: ₹${s.price}</span>`).join(' ');

      card.innerHTML = `
        <div class="baina-box-img-box" onclick="showToast('Simulated image upload for box')">
          <span style="font-size: 24px;">🎁</span>
          <span>Photo ✓</span>
        </div>
        <div class="baina-box-body">
          <div class="baina-box-title">${box.name}</div>
          <div class="baina-box-contents">${box.contents}</div>
          <div style="font-size: 13px; font-weight: 700; color: var(--color-red); margin-top: 4px;">
            ½ kg Base: ₹${box.priceHalfKg} &nbsp;|&nbsp; 1 kg: ₹${box.priceOneKg}
          </div>
          ${customSizesHtml ? `<div class="baina-sizes-pills">${customSizesHtml}</div>` : ''}
        </div>
        <div class="dish-actions">
          <button type="button" class="btn-dish-action" onclick="openBoxModal('${box.id}')">Edit</button>
          <button type="button" class="btn-dish-action delete" onclick="deleteBox('${box.id}')">Remove</button>
        </div>
      `;
      container.appendChild(card);
    });
  });
}

function renderBainaReview() {
  const b = state.baina;
  const revStudio = document.getElementById('baina-rev-studio');
  if (revStudio) revStudio.textContent = b.studioName;

  const revTerms = document.getElementById('baina-rev-terms');
  if (revTerms) revTerms.textContent = `Min Order: ${b.minOrderBoxes} boxes · Lead Notice: ${b.leadDays} days`;

  const revPkg = document.getElementById('baina-rev-packaging');
  if (revPkg) revPkg.textContent = `Primary Packaging: ${b.packaging.toUpperCase()} · Custom ribbons & wedding monograms supported`;

  const revBoxes = document.getElementById('baina-rev-boxes-list');
  if (revBoxes) {
    revBoxes.innerHTML = b.boxes.map(box => `
      <div style="padding: 6px 0; border-bottom: 1px dashed rgba(240,208,158,0.3); font-size: 13px;">
        <strong>${box.name}</strong> (½ kg: ₹${box.priceHalfKg} | 1 kg: ₹${box.priceOneKg})<br/>
        <span style="font-size: 12px; color: #666;">${box.contents}</span>
      </div>
    `).join('');
  }
}

// ==========================================================================
// INTERACTIVE MODALS (ADD / EDIT DISH, DELICACY, BAINA BOX)
// ==========================================================================

function bindModalEvents() {
  // Backdrop click closes
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
}

// ── Dish Modal Handlers ──
function openDishModal(dishId = null) {
  state.editingDishId = dishId;
  const modal = document.getElementById('modal-dish-editor');
  if (!modal) return;

  const titleEl = modal.querySelector('.modal-title');
  const nameInput = document.getElementById('modal-dish-name');
  const courseSelect = document.getElementById('modal-dish-course');
  const dietVegBtn = document.getElementById('modal-diet-veg');
  const dietNonVegBtn = document.getElementById('modal-diet-nonveg');
  const descInput = document.getElementById('modal-dish-desc');

  // Populate courses in select dropdown
  if (courseSelect) {
    courseSelect.innerHTML = state.catering.courses.map(c => `
      <option value="${c.id}" ${c.id === state.catering.activeCourseTab ? 'selected' : ''}>${c.name}</option>
    `).join('');
  }

  if (dishId) {
    const dish = state.catering.dishes.find(d => d.id === dishId);
    if (dish) {
      if (titleEl) titleEl.textContent = "Edit Catering Dish";
      if (nameInput) nameInput.value = dish.name;
      if (courseSelect) courseSelect.value = dish.course;
      if (descInput) descInput.value = dish.desc || '';
      setModalDiet(dish.diet);
      setModalTiers(dish.tiers);
    }
  } else {
    if (titleEl) titleEl.textContent = "Add New Catering Dish";
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    setModalDiet('veg');
    setModalTiers(['Silver', 'Gold', 'Platinum']);
  }

  modal.classList.add('open');
}

function setModalDiet(diet) {
  const vegBtn = document.getElementById('modal-diet-veg');
  const nonVegBtn = document.getElementById('modal-diet-nonveg');
  if (vegBtn && nonVegBtn) {
    vegBtn.classList.toggle('active', diet === 'veg');
    nonVegBtn.classList.toggle('active', diet === 'non-veg');
  }
}

function setModalTiers(tiers) {
  document.querySelectorAll('#modal-dish-editor input[name="dish-tiers"]').forEach(cb => {
    cb.checked = tiers.includes(cb.value);
  });
}

function saveDish() {
  const nameInput = document.getElementById('modal-dish-name');
  const courseSelect = document.getElementById('modal-dish-course');
  const descInput = document.getElementById('modal-dish-desc');
  const isVeg = document.getElementById('modal-diet-veg').classList.contains('active');

  const selectedTiers = [];
  document.querySelectorAll('#modal-dish-editor input[name="dish-tiers"]:checked').forEach(cb => {
    selectedTiers.push(cb.value);
  });

  if (!nameInput.value.trim()) {
    alert("Please enter a dish name.");
    return;
  }
  if (selectedTiers.length === 0) {
    alert("Please assign at least one feast tier (Silver, Gold, or Platinum).");
    return;
  }

  if (state.editingDishId) {
    const dish = state.catering.dishes.find(d => d.id === state.editingDishId);
    if (dish) {
      dish.name = nameInput.value.trim();
      dish.course = courseSelect.value;
      dish.diet = isVeg ? 'veg' : 'non-veg';
      dish.desc = descInput.value.trim();
      dish.tiers = selectedTiers;
      showToast(`Updated "${dish.name}"`);
    }
  } else {
    const newDish = {
      id: `d-${Date.now()}`,
      name: nameInput.value.trim(),
      course: courseSelect.value,
      diet: isVeg ? 'veg' : 'non-veg',
      desc: descInput.value.trim(),
      tiers: selectedTiers
    };
    state.catering.dishes.push(newDish);
    showToast(`Added "${newDish.name}" to menu`);
  }

  closeAllModals();
  renderCourseTabs();
  renderCateringDishes();
  renderCourseManageList();
}

function deleteDish(dishId) {
  const dish = state.catering.dishes.find(d => d.id === dishId);
  if (!confirm(`Are you sure you want to remove "${dish ? dish.name : 'this dish'}"?`)) return;
  state.catering.dishes = state.catering.dishes.filter(d => d.id !== dishId);
  renderCourseTabs();
  renderCateringDishes();
  renderCourseManageList();
  showToast("Dish removed from catalog");
}

// ── Delicacy Modal Handlers ──
function openDelicacyModal(delId = null) {
  state.editingDelicacyId = delId;
  const modal = document.getElementById('modal-delicacy-editor');
  if (!modal) return;

  const titleEl = modal.querySelector('.modal-title');
  const nameInput = document.getElementById('modal-del-name');
  const priceInput = document.getElementById('modal-del-price');
  const descInput = document.getElementById('modal-del-desc');

  if (delId) {
    const item = state.stall.delicacies.find(d => d.id === delId);
    if (item) {
      if (titleEl) titleEl.textContent = "Edit Stall Delicacy";
      if (nameInput) nameInput.value = item.name;
      if (priceInput) priceInput.value = item.price;
      if (descInput) descInput.value = item.desc || '';
      setDelicacyDiet(item.diet);
    }
  } else {
    if (titleEl) titleEl.textContent = "Add New Stall Delicacy";
    if (nameInput) nameInput.value = '';
    if (priceInput) priceInput.value = '180';
    if (descInput) descInput.value = '';
    setDelicacyDiet('veg');
  }

  modal.classList.add('open');
}

function setDelicacyDiet(diet) {
  const vegBtn = document.getElementById('modal-del-diet-veg');
  const nonVegBtn = document.getElementById('modal-del-diet-nonveg');
  if (vegBtn && nonVegBtn) {
    vegBtn.classList.toggle('active', diet === 'veg');
    nonVegBtn.classList.toggle('active', diet === 'non-veg');
  }
}

function saveDelicacy() {
  const nameInput = document.getElementById('modal-del-name');
  const priceInput = document.getElementById('modal-del-price');
  const descInput = document.getElementById('modal-del-desc');
  const isVeg = document.getElementById('modal-del-diet-veg').classList.contains('active');

  if (!nameInput.value.trim()) {
    alert("Please enter a delicacy name.");
    return;
  }

  if (state.editingDelicacyId) {
    const item = state.stall.delicacies.find(d => d.id === state.editingDelicacyId);
    if (item) {
      item.name = nameInput.value.trim();
      item.price = Number(priceInput.value) || 0;
      item.diet = isVeg ? 'veg' : 'non-veg';
      item.desc = descInput.value.trim();
      showToast(`Updated "${item.name}"`);
    }
  } else {
    const newItem = {
      id: `del-${Date.now()}`,
      name: nameInput.value.trim(),
      price: Number(priceInput.value) || 0,
      diet: isVeg ? 'veg' : 'non-veg',
      desc: descInput.value.trim()
    };
    state.stall.delicacies.push(newItem);
    showToast(`Added "${newItem.name}" to stall`);
  }

  closeAllModals();
  renderStallDelicacies();
}

function deleteDelicacy(delId) {
  const item = state.stall.delicacies.find(d => d.id === delId);
  if (!confirm(`Are you sure you want to remove "${item ? item.name : 'this item'}"?`)) return;
  state.stall.delicacies = state.stall.delicacies.filter(d => d.id !== delId);
  renderStallDelicacies();
  showToast("Delicacy removed");
}

// ── Baina Box Modal Handlers ──
function openBoxModal(boxId = null) {
  state.editingBoxId = boxId;
  const modal = document.getElementById('modal-box-editor');
  if (!modal) return;

  const titleEl = modal.querySelector('.modal-title');
  const nameInput = document.getElementById('modal-box-name');
  const contentsInput = document.getElementById('modal-box-contents');
  const halfKgInput = document.getElementById('modal-box-half-kg');
  const oneKgInput = document.getElementById('modal-box-one-kg');

  if (boxId) {
    const box = state.baina.boxes.find(b => b.id === boxId);
    if (box) {
      if (titleEl) titleEl.textContent = "Edit Baina Gifting Box";
      if (nameInput) nameInput.value = box.name;
      if (contentsInput) contentsInput.value = box.contents;
      if (halfKgInput) halfKgInput.value = box.priceHalfKg;
      if (oneKgInput) oneKgInput.value = box.priceOneKg;
    }
  } else {
    if (titleEl) titleEl.textContent = "Add New Baina Gifting Box";
    if (nameInput) nameInput.value = '';
    if (contentsInput) contentsInput.value = '';
    if (halfKgInput) halfKgInput.value = '600';
    if (oneKgInput) oneKgInput.value = '1100';
  }

  modal.classList.add('open');
}

function saveBox() {
  const nameInput = document.getElementById('modal-box-name');
  const contentsInput = document.getElementById('modal-box-contents');
  const halfKgInput = document.getElementById('modal-box-half-kg');
  const oneKgInput = document.getElementById('modal-box-one-kg');

  if (!nameInput.value.trim()) {
    alert("Please enter a box name.");
    return;
  }

  if (state.editingBoxId) {
    const box = state.baina.boxes.find(b => b.id === state.editingBoxId);
    if (box) {
      box.name = nameInput.value.trim();
      box.contents = contentsInput.value.trim();
      box.priceHalfKg = Number(halfKgInput.value) || 0;
      box.priceOneKg = Number(oneKgInput.value) || 0;
      showToast(`Updated "${box.name}"`);
    }
  } else {
    const newBox = {
      id: `b-${Date.now()}`,
      name: nameInput.value.trim(),
      contents: contentsInput.value.trim(),
      priceHalfKg: Number(halfKgInput.value) || 0,
      priceOneKg: Number(oneKgInput.value) || 0,
      customSizes: [{ label: "250g", price: Math.round(Number(halfKgInput.value) * 0.55) }],
      photo: "Uploaded ✓"
    };
    state.baina.boxes.push(newBox);
    showToast(`Added "${newBox.name}"`);
  }

  closeAllModals();
  renderBainaBoxes();
}

function deleteBox(boxId) {
  if (state.baina.boxes.length <= 1) {
    showToast("Must have at least one Baina Box configured.");
    return;
  }
  const box = state.baina.boxes.find(b => b.id === boxId);
  if (!confirm(`Are you sure you want to remove "${box ? box.name : 'this box'}"?`)) return;
  state.baina.boxes = state.baina.boxes.filter(b => b.id !== boxId);
  renderBainaBoxes();
  showToast("Box removed");
}

// ==========================================================================
// POPULATE FINAL REGISTRATION REVIEW SCREEN (VIEW 08)
// ==========================================================================

function populateReviewScreen() {
  // 1. Details Card
  const revBusiness = document.getElementById('rev-business-name');
  if (revBusiness) revBusiness.textContent = state.details.businessName;

  const revOwner = document.getElementById('rev-owner-name');
  if (revOwner) revOwner.textContent = `${state.details.ownerName} (${state.details.phone})`;

  const revLocation = document.getElementById('rev-location');
  if (revLocation) revLocation.textContent = `${state.details.city}, ${state.details.state}`;

  const revCuisines = document.getElementById('rev-cuisines');
  if (revCuisines) revCuisines.textContent = state.details.cuisines.join(', ');

  // 2. Basic Info Card
  const revCapacity = document.getElementById('rev-capacity');
  if (revCapacity) revCapacity.textContent = `${state.basic.minGuests} to ${state.basic.maxGuests} guests (${state.basic.maxEventsPerDay} events/day)`;

  const revCities = document.getElementById('rev-cities');
  if (revCities) revCities.textContent = state.basic.serviceCities.join(', ');

  // 3. KYC Card
  const revGst = document.getElementById('rev-gst');
  if (revGst) revGst.textContent = `${state.kyc.gstNumber} (Certificate Attached)`;

  const revFssai = document.getElementById('rev-fssai');
  if (revFssai) revFssai.textContent = `${state.kyc.fssaiNumber} (Licence Attached)`;

  // 4. Offerings Card
  const revOfferings = document.getElementById('rev-offerings');
  if (revOfferings) {
    revOfferings.innerHTML = state.selectedOfferings.map(o => {
      const icon = o === 'catering' ? '🍲' : o === 'stall' ? '🍢' : '🎁';
      return `<span class="chip selected">${icon} ${o.charAt(0).toUpperCase() + o.slice(1)}</span>`;
    }).join(' ');
  }

  // 5. Service Config Summary
  const revServiceDetails = document.getElementById('rev-service-details');
  if (revServiceDetails) {
    let summaryHtml = '';

    if (state.selectedOfferings.includes('catering')) {
      const c = state.catering;
      summaryHtml += `
        <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed rgba(240,208,158,0.3);">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="font-weight: 700; color: #B92025; font-size: 15px;">🍲 Catering Menu: ${c.feastName}</div>
            <button type="button" class="btn-dish-action" onclick="goToStep('view-cat-basics')">Edit Catering →</button>
          </div>
          <div style="font-size: 13px; margin-top: 4px;">
            <strong>Rates:</strong> Silver ₹${c.tierPrices.silver}/p · Gold ₹${c.tierPrices.gold}/p · Platinum ₹${c.tierPrices.platinum}/p
          </div>
          <div style="font-size: 12px; color: #555; margin-top: 4px;">
            <strong>Catalog:</strong> ${c.courses.length} Courses · ${c.dishes.length} Dishes configured · Live Counters: ${c.liveCounters.join(', ')}
          </div>
        </div>
      `;
    }

    if (state.selectedOfferings.includes('stall')) {
      const s = state.stall;
      summaryHtml += `
        <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed rgba(240,208,158,0.3);">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="font-weight: 700; color: #B92025; font-size: 15px;">🍢 Single Stall: ${s.stallName}</div>
            <button type="button" class="btn-dish-action" onclick="goToStep('view-stall-basics')">Edit Stall →</button>
          </div>
          <div style="font-size: 13px; margin-top: 4px;">
            <strong>Specialty:</strong> ${s.specialty} · <strong>Format:</strong> ${s.menuType === 'fixed' ? `Fixed Spread (₹${s.fixedPerPlate}/plate)` : 'Varied Build-Your-Own'}
          </div>
          <div style="font-size: 12px; color: #555; margin-top: 4px;">
            <strong>Delicacies:</strong> ${s.delicacies.length} items · Min Guarantee: ${s.minPaxGuarantee} pax
          </div>
        </div>
      `;
    }

    if (state.selectedOfferings.includes('baina')) {
      const b = state.baina;
      summaryHtml += `
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="font-weight: 700; color: #B92025; font-size: 15px;">🎁 Baina Boxes: ${b.studioName}</div>
            <button type="button" class="btn-dish-action" onclick="goToStep('view-baina-basics')">Edit Baina →</button>
          </div>
          <div style="font-size: 13px; margin-top: 4px;">
            <strong>Catalog:</strong> ${b.boxes.length} Signature Boxes (starting at ₹${b.boxes[0].priceHalfKg}/box)
          </div>
          <div style="font-size: 12px; color: #555; margin-top: 4px;">
            <strong>Order Scope:</strong> Min ${b.minOrderBoxes} boxes · ${b.leadDays} days lead notice · Style: ${b.packaging.toUpperCase()}
          </div>
        </div>
      `;
    }

    revServiceDetails.innerHTML = summaryHtml;
  }
}

// ── Toast Notification Helper ──
function showToast(msg) {
  const toast = document.getElementById('prototype-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Viewport Mode Switcher ──
function setViewMode(mode) {
  document.body.classList.remove('mode-sidebyside', 'mode-desktop', 'mode-mobile');
  document.body.classList.add(`mode-${mode}`);

  document.querySelectorAll('.btn-toggle[data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });
}

// ── Scenario Presets (For Client Walkthrough) ──
function applyScenarioPreset(presetKey) {
  if (presetKey === 'catering') {
    state.selectedOfferings = ['catering'];
    state.details.businessName = "Awadhi Royal Caterers";
    state.details.cuisines = ["Awadhi", "Mughlai", "North Indian"];
    showToast("Loaded Preset: Full Feast Caterer");
  } else if (presetKey === 'stall') {
    state.selectedOfferings = ['stall'];
    state.details.businessName = "Lucknow Famous Biryani & Kebab Corner";
    state.details.cuisines = ["Mughlai", "Chaat", "Street Food"];
    showToast("Loaded Preset: Specialty Food Stall");
  } else if (presetKey === 'baina') {
    state.selectedOfferings = ['baina'];
    state.details.businessName = "Ram Asrey Halwai & Mithai Artisan";
    state.details.cuisines = ["Sweets", "Baina Boxes", "North Indian"];
    showToast("Loaded Preset: Mithai & Baina Artisan");
  } else if (presetKey === 'all') {
    state.selectedOfferings = ['catering', 'stall', 'baina'];
    state.details.businessName = "Shahi Dastarkhwan & Gifting Studio";
    state.details.cuisines = ["Awadhi", "Mughlai", "Sweets", "Baina Boxes"];
    showToast("Loaded Preset: Multi-Service Enterprise (All 3)");
  }

  // Update offering cards
  document.querySelectorAll('.service-card-select').forEach(card => {
    const key = card.getAttribute('data-offering');
    const isSelected = state.selectedOfferings.includes(key);
    card.classList.toggle('selected', isSelected);
    const ind = card.querySelector('.service-checkbox-indicator');
    if (ind) ind.textContent = isSelected ? '✓' : '';
  });

  initStepper();
  updateStepperUI();
  updateSubnavBar();
  populateReviewScreen();
  goToStep('view-details');
}
