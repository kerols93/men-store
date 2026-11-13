/**
 * ==============================================================================
 * MAN - Men's Fashion Luxury Dark Store (JavaScript)
 * نظام تفاعلي متكامل ومُحسّن:
 * 1. جلب المنتجات ديناميكياً من Google Sheets عبر fetch() GET Request
 * 2. دعم عرض سعرين (سعر حالي + سعر قبل الخصم مع شارة الخصم تلقائياً)
 * 3. حل مشكلة محاذاة أزرار الكروت عبر توحيد كلاس product-card-footer و product-bottom
 * 4. قائمة موبايل منبثقة تفاعلية (Hamburger Drawer) + زر واتساب عائم أسفل الشاشة
 * 5. حفظ واسترجاع سلة المشتريات تلقائياً عبر localStorage
 * 6. نظام كوبونات خصم حسابي حقيقي (MAN20, MAN10, WELCOME, VIP) يُخصم من الإجمالي
 * 7. تحديث جميع أرقام وروابط الواتساب تلقائياً في كامل الصفحة من متغير WHATSAPP_PHONE
 * 8. فلترة فئات آمنة ضد علامات التنصيص عبر data-category و Event Delegation
 * 9. التحقق الصارم من صحة رقم الهاتف المصري (01XXXXXXXXX) وتفريغ السلة بعد إرسال الطلب
 * ==============================================================================
 */

// -----------------------------------------------------------------------------
// 1. إعدادات المتجر ورقم الواتساب
// -----------------------------------------------------------------------------
// ضع رابط Web App الخاص بك هنا بعد نشر Code.gs من جوجل شيت
// إذا تُرك فارغاً، سيعمل المتجر تلقائياً بالمنتجات الافتراضية عالية الجودة
const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbwtIwnrT6_st8j3QjHN_3j2cNQsEV_KKJW0cLaPevsSQNL51kG1bVL1HdPcOCuYv5o/exec"; 

// رقم الواتساب المعتمد للمتجر بصيغته الدولية (تغييره هنا يحدّث الموقع بالكامل)
const WHATSAPP_PHONE = "201200297370";

// العملة والشحن
const CURRENCY_LABEL = "ج.م";
const FREE_SHIPPING_THRESHOLD = 500; // شحن مجاني فوق 500 جنيه مصري
const DEFAULT_SHIPPING_FEE = 50;     // تكلفة الشحن داخل محافظات مصر

// -----------------------------------------------------------------------------
// أكواد الخصم الافتراضية وإدارتها الديناميكية (يمكن إضافة/إلغاء أكواد من شيت جوجل أو من المتجر)
// -----------------------------------------------------------------------------
const DEFAULT_COUPONS = {
    "MAN20": { code: "MAN20", percent: 20, active: true, status: "مفعل", desc: "خصم 20% لعملاء MAN", minOrder: 0 },
    "MAN10": { code: "MAN10", percent: 10, active: true, status: "مفعل", desc: "خصم 10% إضافي", minOrder: 0 },
    "WELCOME": { code: "WELCOME", percent: 15, active: true, status: "مفعل", desc: "خصم ترحيبي 15%", minOrder: 300 },
    "VIP": { code: "VIP", percent: 25, active: true, status: "مفعل", desc: "خصم كبار الشخصيات 25%", minOrder: 1000 }
};

let storeCoupons = { ...DEFAULT_COUPONS };

// -----------------------------------------------------------------------------
// 2. المنتجات الاحتياطية (تظهر مباشرة لحين ربط شيت جوجل)
// -----------------------------------------------------------------------------
const DEFAULT_PRODUCTS = [
    {
        id: "prod-1",
        name: "بدلة سهرة توكسيدو إيطالية فاخرة",
        category: "بدل رسمية",
        price: 2890,
        oldPrice: 3400,
        sizes: ["48", "50", "52", "54"],
        selectedSize: "50",
        isBestSeller: true,
        ordersCount: 42,
        rating: "★★★★★ (48 تقييم)",
        description: "بدلة توكسيدو إيطالية باللون الأسود الليلي العميق، قصة Slim Fit ملكية بياقة ساتان لامعة مع بطانة حريرية مريحة للمناسبات الرسمية.",
        image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop"
    },
    {
        id: "prod-2",
        name: "جاكيت جلد طبيعي 'Black Matte'",
        category: "جواكت ومعاطف",
        price: 1950,
        oldPrice: 2450,
        sizes: ["M", "L", "XL", "XXL"],
        selectedSize: "L",
        isBestSeller: true,
        ordersCount: 38,
        rating: "★★★★★ (35 تقييم)",
        description: "جاكيت جلد طبيعي 100% بلون أسود مطفي عالي المقاومة، سحابات معدنية متينة وقصة بايبر عصرية تناسب الإطلالات الكاجوال والفخمة.",
        image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop"
    },
    {
        id: "prod-3",
        name: "معطف شتوي كلاسيكي طويل من الصوف",
        category: "جواكت ومعاطف",
        price: 2450,
        oldPrice: null, // سعر واحد بدون خصم
        sizes: ["M", "L", "XL", "XXL"],
        selectedSize: "L",
        isBestSeller: false,
        ordersCount: 15,
        rating: "★★★★★ (29 تقييم)",
        description: "معطف صوف إيطالي فاخر بتصميم Double-Breasted طويل لحماية وأناقة لا تضاهى في شتاء مصر البارد.",
        image: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop"
    },
    {
        id: "prod-4",
        name: "قميص سليم فيت قطني بقصة عصرية",
        category: "قمصان وتيشيرتات",
        price: 690,
        oldPrice: 850,
        sizes: ["S", "M", "L", "XL"],
        selectedSize: "L",
        isBestSeller: true,
        ordersCount: 52,
        rating: "★★★★★ (62 تقييم)",
        description: "قميص أسود أنيق منسوج من خيوط القطن المصري طويل التيلة 100% مع معالجة ضد التجعد وأزرار سوداء مصقولة.",
        image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop"
    },
    {
        id: "prod-5",
        name: "ساعة كرونوغراف رياضية أسود ملوكي",
        category: "إكسسوارات وساعات",
        price: 1450,
        oldPrice: 1800,
        sizes: ["قياسي"],
        selectedSize: "قياسي",
        isBestSeller: false,
        ordersCount: 21,
        rating: "★★★★★ (54 تقييم)",
        description: "ساعة يد فاخرة بمينا أسود كامل غير لامع، زجاج ياقوتي مقاوم للخدش، وحزام ستانلس ستيل مطلي بالكربون الشبيه بالألماس.",
        image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop"
    },
    {
        id: "prod-6",
        name: "حذاء تشيلسي أسود من الجلد الإيطالي",
        category: "أحذية فاخرة",
        price: 1290,
        oldPrice: 1550,
        sizes: ["41", "42", "43", "44", "45"],
        selectedSize: "42",
        isBestSeller: true,
        ordersCount: 31,
        rating: "★★★★★ (41 تقييم)",
        description: "حذاء تشيلسي إيطالي يدوي الصنع من الجلد الطبيعي الممتاز، نعل مريح مانع للانزلاق وجوانب مطاطية مرنة لسهولة الارتداء.",
        image: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?q=80&w=800&auto=format&fit=crop"
    }
];

// حالة التطبيق العامة
let productsData = [];
let activeCategory = "الكل";
let cart = [];
let activeCoupon = null;

// -----------------------------------------------------------------------------
// 3. إدارة التخزين المحلي (localStorage) لسلة المشتريات والكوبونات
// -----------------------------------------------------------------------------
function loadCartFromStorage() {
    try {
        const storedCart = localStorage.getItem("man_cart");
        if (storedCart) {
            cart = JSON.parse(storedCart);
        } else {
            cart = [];
        }

        const storedCoupon = localStorage.getItem("man_coupon");
        if (storedCoupon) {
            activeCoupon = JSON.parse(storedCoupon);
            if (activeCoupon && activeCoupon.percent > 0 && activeCoupon.percent <= 1) {
                activeCoupon.percent = Math.round(activeCoupon.percent * 100);
            }
        }

        // استرجاع الكوبونات المخصصة المضافة أو المعدلة من قبل صاحب المتجر
        const customCoupons = localStorage.getItem("man_store_coupons");
        if (customCoupons) {
            const parsed = JSON.parse(customCoupons);
            storeCoupons = { ...DEFAULT_COUPONS, ...parsed };
        }
    } catch (e) {
        console.warn("خطأ في استرجاع السلة أو الكوبونات من localStorage:", e);
        cart = [];
        activeCoupon = null;
    }
}

function saveCartToStorage() {
    try {
        localStorage.setItem("man_cart", JSON.stringify(cart));
        if (activeCoupon) {
            localStorage.setItem("man_coupon", JSON.stringify(activeCoupon));
        } else {
            localStorage.removeItem("man_coupon");
        }
    } catch (e) {
        console.warn("خطأ في حفظ السلة في localStorage:", e);
    }
}

// -----------------------------------------------------------------------------
// 4. تنسيق الأسعار والهروب الآمن للنصوص
// -----------------------------------------------------------------------------
function formatPrice(amount) {
    const num = parseFloat(amount) || 0;
    return `${num.toLocaleString("ar-EG")} ${CURRENCY_LABEL}`;
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// -----------------------------------------------------------------------------
// 5. مزامنة روابط وأرقام الواتساب ديناميكياً في كامل الصفحة
// -----------------------------------------------------------------------------
function syncWhatsAppLinks() {
    const egyptLocalPhone = WHATSAPP_PHONE.startsWith("20") 
        ? "0" + WHATSAPP_PHONE.slice(2) 
        : (WHATSAPP_PHONE.startsWith("2") ? "0" + WHATSAPP_PHONE.slice(1) : WHATSAPP_PHONE);

    // تحديث كافة الروابط المخصصة
    const whatsappLinks = document.querySelectorAll('a[data-whatsapp-link], a[href*="wa.me"]');
    whatsappLinks.forEach(link => {
        link.href = `https://wa.me/${WHATSAPP_PHONE}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    });

    // تحديث النصوص المعروضة للرقم
    const phoneDisplays = document.querySelectorAll('[data-whatsapp-display]');
    phoneDisplays.forEach(el => {
        el.innerText = egyptLocalPhone;
    });
}

// -----------------------------------------------------------------------------
// 6. إدارة سجل تكرار طلبات المنتجات محلياً (لتحديد الأكثر طلباً تلقائياً)
// -----------------------------------------------------------------------------
function getLocalOrdersTally() {
    try {
        const stored = localStorage.getItem("man_orders_tally");
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
}

function incrementProductOrderTally(productId) {
    try {
        const tally = getLocalOrdersTally();
        tally[productId] = (tally[productId] || 0) + 1;
        localStorage.setItem("man_orders_tally", JSON.stringify(tally));
    } catch (e) {
        console.warn("تعذر حفظ سجل الطلبات محلياً:", e);
    }
}

function isProductBestSeller(product) {
    if (product.isBestSeller) return true;
    const tally = getLocalOrdersTally();
    const localCount = tally[product.id] || 0;
    const totalOrders = (product.ordersCount || 0) + localCount;
    return totalOrders >= 25;
}

// -----------------------------------------------------------------------------
// 7. جلب المنتجات باستخدام fetch() من رابط Google Apps Script (GET Request)
// -----------------------------------------------------------------------------
async function fetchProductsFromGoogleSheet() {
    if (!GOOGLE_SHEET_API_URL || GOOGLE_SHEET_API_URL.trim() === "" || GOOGLE_SHEET_API_URL.includes("AKfycbz...")) {
        console.log("ℹ️ تم تحميل المنتجات الافتراضية (لم يتم تعيين رابط جوجل شيت بعد).");
        initProducts(DEFAULT_PRODUCTS);
        return;
    }

    try {
        const response = await fetch(GOOGLE_SHEET_API_URL, {
            method: "GET",
            headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`خطأ في استجابة السيرفر: ${response.status}`);
        }

        const result = await response.json();
        const items = Array.isArray(result) ? result : (result.data || []);

        // استخراج الكوبونات من شيت جوجل وتحديثها تلقائياً
        if (result.coupons && Array.isArray(result.coupons) && result.coupons.length > 0) {
            storeCoupons = {}; // اعتماد كوبونات شيت جوجل الحقيقية الخاصة بصاحب المتجر
            result.coupons.forEach(c => {
                const code = String(c.code || "").trim().toUpperCase();
                if (code) {
                    let percent = parseFloat(c.percent) || 0;
                    if (percent > 0 && percent <= 1) {
                        percent = Math.round(percent * 100);
                    }
                    storeCoupons[code] = {
                        code: code,
                        percent: percent,
                        active: Boolean(c.active !== false && c.status !== "معطل" && c.status !== "ملغي"),
                        status: c.status || (c.active ? "مفعل" : "معطل"),
                        desc: c.desc || `خصم ${percent}%`,
                        minOrder: parseFloat(c.minOrder) || 0
                    };
                }
            });
            localStorage.setItem("man_store_coupons", JSON.stringify(storeCoupons));
            console.log(`✅ تم جلب وتحديث ${result.coupons.length} كود خصم من Google Sheets:`, storeCoupons);
        }

        if (items && items.length > 0) {
            console.log(`✅ تم جلب ${items.length} منتج بنجاح من Google Sheets.`);
            initProducts(items);
        } else {
            console.warn("⚠️ شيت جوجل لا يحتوي على صفوف بيانات، تم استخدام المنتجات الافتراضية.");
            initProducts(DEFAULT_PRODUCTS);
        }
    } catch (error) {
        console.error("❌ تعذر جلب المنتجات من Google Sheets:", error);
        showToast("تعذر جلب الشيت حالياً، تم تحميل التشكيلة المحفوظة للمتجر", "error");
        initProducts(DEFAULT_PRODUCTS);
    }
}

function initProducts(items) {
    productsData = items.map((item, index) => {
        const price = parseFloat(item.price) || 0;
        const oldPrice = item.oldPrice ? parseFloat(item.oldPrice) : null;
        
        let sizes = item.sizes;
        if (typeof sizes === "string") {
            sizes = sizes.split(/[,،\/\-]/).map(s => s.trim()).filter(Boolean);
        }
        if (!Array.isArray(sizes) || sizes.length === 0) {
            sizes = ["M", "L", "XL", "XXL"];
        }

        return {
            id: item.id ? String(item.id) : `prod-${index + 1}`,
            name: item.name || "منتج رجالي فاخر",
            category: (item.category || "أخرى").trim(),
            price: price,
            oldPrice: (oldPrice && oldPrice > price) ? oldPrice : null,
            image: item.image || "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop",
            sizes: sizes,
            selectedSize: sizes[0],
            isBestSeller: Boolean(item.isBestSeller === true || String(item.isBestSeller).toLowerCase() === "true" || String(item.isBestSeller) === "نعم"),
            ordersCount: parseInt(item.ordersCount) || 0,
            rating: item.rating || "★★★★★ (45 تقييم)",
            description: item.description || "أزياء رجالية استثنائية صُممت بدقة لتمنحك الأناقة والراحة المطلقة في كل مناسبة."
        };
    });

    renderCategoryFilters();
    distributeProducts();
}

// -----------------------------------------------------------------------------
// 8. دالة توليد عنصر كرت المنتج (HTML Card Generator)
// توحيد كلاس الفوتر: product-card-footer product-bottom لضمان margin-top: auto
// -----------------------------------------------------------------------------
function createProductCardHTML(product) {
    let discountBadgeHTML = "";
    if (product.oldPrice && product.oldPrice > product.price) {
        const discountPct = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
        discountBadgeHTML = `<span class="product-badge badge-discount">خصم ${discountPct}%</span>`;
    }

    const isBest = isProductBestSeller(product);
    const bestSellerBadgeHTML = isBest 
        ? `<span class="product-badge badge-bestseller">الأكثر طلباً 🔥</span>` 
        : "";

    const sizesHTML = product.sizes.map((s, idx) => `
        <button type="button" class="size-btn ${idx === 0 ? "active" : ""}" onclick="chooseSize(this)">${escapeHtml(s)}</button>
    `).join("");

    const priceBlockHTML = `
        <div class="price-wrap">
            <span class="current-price">${formatPrice(product.price)}</span>
            ${product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : ""}
        </div>
    `;

    return `
        <article class="product-card" data-id="${escapeHtml(product.id)}" data-name="${escapeHtml(product.name)}" data-price="${product.price}">
            <div class="product-image-wrap" onclick="openProductModal('${escapeHtml(product.id)}')" title="انقر لمعاينة ${escapeHtml(product.name)}">
                ${bestSellerBadgeHTML}
                ${discountBadgeHTML}
                <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="product-img" loading="lazy">
                <div class="product-overlay">
                    <button type="button" class="quick-view-btn">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        معاينة وتفاصيل
                    </button>
                </div>
            </div>
            <div class="product-info">
                <span class="product-category">${escapeHtml(product.category)}</span>
                <h3 class="product-title" onclick="openProductModal('${escapeHtml(product.id)}')">${escapeHtml(product.name)}</h3>
                <div class="product-rating">
                    <span class="stars">★★★★★</span>
                    <span class="rating-count">${escapeHtml(product.rating)}</span>
                </div>
                
                <div class="product-sizes">
                    <span class="size-label">المقاس المتاح:</span>
                    <div class="size-options">
                        ${sizesHTML}
                    </div>
                </div>

                <!-- توحيد الكلاسين product-card-footer و product-bottom لضمان استواء الأزرار في الأسفل دائماً -->
                <div class="product-card-footer product-bottom">
                    ${priceBlockHTML}
                    <div class="product-actions-group">
                        <button type="button" class="add-to-cart-btn" onclick="addProductToCart(this)" title="أضف إلى السلة">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                            أضف للسلة
                        </button>
                        <button type="button" class="whatsapp-btn" onclick="orderViaWhatsApp(this)" title="طلب هذا المنتج عبر واتساب">
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            طلب عبر واتساب
                        </button>
                    </div>
                </div>
            </div>
        </article>
    `;
}

// -----------------------------------------------------------------------------
// 9. توزيع المنتجات على القسمين (الأكثر مبيعاً + التشكيلة الكاملة)
// -----------------------------------------------------------------------------
function distributeProducts() {
    renderBestSellers();
    renderFilteredProducts();
}

function renderBestSellers() {
    const container = document.getElementById("bestsellers-grid");
    if (!container) return;

    let bestItems = productsData.filter(p => isProductBestSeller(p));

    if (bestItems.length === 0) {
        bestItems = [...productsData].sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0)).slice(0, 3);
    }

    if (bestItems.length === 0) {
        container.innerHTML = `
            <div class="empty-products-msg">
                <p>لا توجد منتجات متوفرة حالياً في هذا القسم</p>
            </div>
        `;
        return;
    }

    container.innerHTML = bestItems.map(p => createProductCardHTML(p)).join("");
}

// توليد أزرار التصنيفات بأمان كامل مع data-category
function renderCategoryFilters() {
    const filterContainer = document.getElementById("category-filters");
    if (!filterContainer) return;

    const uniqueCategories = ["الكل", ...new Set(productsData.map(p => p.category.trim()).filter(Boolean))];

    filterContainer.innerHTML = uniqueCategories.map(cat => {
        const safeAttr = cat.replace(/"/g, "&quot;");
        return `<button type="button" class="filter-btn ${cat === activeCategory ? "active" : ""}" data-category="${safeAttr}">${escapeHtml(cat)}</button>`;
    }).join("");
}

// تصفية المنتجات عند اختيار أي قسم
function setCategoryFilter(categoryName) {
    activeCategory = categoryName;

    const buttons = document.querySelectorAll("#category-filters .filter-btn");
    buttons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.category === categoryName);
    });

    renderFilteredProducts();
}

function renderFilteredProducts() {
    const container = document.getElementById("products-grid");
    if (!container) return;

    let filtered = productsData;
    if (activeCategory !== "الكل") {
        filtered = productsData.filter(p => p.category === activeCategory);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-products-msg">
                <p>لا توجد منتجات مضافة في قسم "${escapeHtml(activeCategory)}" حتى الآن.</p>
                <span>يمكنك إضافة منتجات لهذا القسم من شيت جوجل وسيظهر تلقائياً هنا!</span>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(p => createProductCardHTML(p)).join("");
}

// -----------------------------------------------------------------------------
// 10. تفاعل اختيار المقاسات
// -----------------------------------------------------------------------------
window.chooseSize = function (sizeBtn) {
    const optionsContainer = sizeBtn.closest(".size-options");
    if (optionsContainer) {
        optionsContainer.querySelectorAll(".size-btn").forEach(btn => btn.classList.remove("active"));
        sizeBtn.classList.add("active");
    }
};

// -----------------------------------------------------------------------------
// 11. طلب المنتج عبر واتساب فوراً من كرت العرض
// -----------------------------------------------------------------------------
window.orderViaWhatsApp = function (btnElement) {
    const card = btnElement.closest(".product-card");
    if (!card) return;

    const productId = card.dataset.id;
    const product = productsData.find(p => p.id === productId);

    const titleEl = card.querySelector(".product-title");
    const productName = product ? product.name : (titleEl ? titleEl.innerText.trim() : "منتج رجالي فاخر");

    const activeSizeBtn = card.querySelector(".size-btn.active");
    const productSize = activeSizeBtn ? activeSizeBtn.innerText.trim() : "قياسي";

    const price = product ? product.price : parseFloat(card.dataset.price) || 0;

    incrementProductOrderTally(productId);
    sendOrderLogToGoogleSheet({
        productId: productId,
        productName: productName,
        size: productSize,
        price: price,
        type: "whatsapp_direct"
    });

    const message = 
`السلام عليكم، أريد طلب هذا المنتج من متجر MAN:
━━━━━━━━━━━━━━━━━━━━
👔 *المنتج:* ${productName}
📏 *المقاس المختار:* ${productSize}
💵 *السعر:* ${formatPrice(price)}
━━━━━━━━━━━━━━━━━━━━
هل المنتج متوفر لتأكيد الطلب وشحنه لمحافظتي؟`;

    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encoded}`;

    const newWindow = window.open(whatsappUrl, "_blank");
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
        window.location.href = whatsappUrl;
    }

    setTimeout(() => renderBestSellers(), 1000);
};

// -----------------------------------------------------------------------------
// 12. نافذة عرض تفاصيل المنتج (Quick View Modal)
// -----------------------------------------------------------------------------
window.openProductModal = function (productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    const modalBackdrop = document.getElementById("product-modal-backdrop");
    const modalContent = document.getElementById("product-modal-content");
    if (!modalBackdrop || !modalContent) return;

    const discountBadge = (product.oldPrice && product.oldPrice > product.price)
        ? `<span class="product-badge badge-discount" style="position:static; display:inline-block; margin-right:8px;">خصم ${Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%</span>`
        : "";

    modalContent.innerHTML = `
        <button type="button" class="modal-close-btn" onclick="closeProductModal()" aria-label="إغلاق">✕</button>
        <div class="modal-grid">
            <div class="modal-img-wrap">
                <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="modal-img">
            </div>
            <div class="modal-details">
                <span class="product-category">${escapeHtml(product.category)}</span>
                <h2 class="modal-title">${escapeHtml(product.name)}</h2>
                <div class="product-rating">
                    <span class="stars">★★★★★</span>
                    <span class="rating-count">${escapeHtml(product.rating)}</span>
                </div>
                <div class="modal-price-wrap" style="display:flex; align-items:baseline; gap:12px; margin: 15px 0;">
                    <span class="modal-price" style="font-size:1.6rem; font-weight:700; color:#fff;">${formatPrice(product.price)}</span>
                    ${product.oldPrice ? `<span class="old-price" style="font-size:1rem; color:var(--text-muted); text-decoration:line-through;">${formatPrice(product.oldPrice)}</span>` : ""}
                    ${discountBadge}
                </div>
                <p class="modal-desc">${escapeHtml(product.description)}</p>
                
                <div class="product-sizes" style="margin: 20px 0;">
                    <span class="size-label">اختر المقاس المناسب لك:</span>
                    <div class="size-options" id="modal-size-options">
                        ${product.sizes.map((s, idx) => `
                            <button type="button" class="size-btn ${idx === 0 ? "active" : ""}" onclick="chooseSize(this)">${escapeHtml(s)}</button>
                        `).join("")}
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="addModalProductToCart('${escapeHtml(product.id)}')">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                        أضف للسلة
                    </button>
                    <button type="button" class="whatsapp-btn" onclick="orderModalProductViaWhatsApp('${escapeHtml(product.id)}')">
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        طلب عبر واتساب
                    </button>
                </div>
            </div>
        </div>
    `;

    modalBackdrop.classList.add("open");
};

window.closeProductModal = function () {
    const modalBackdrop = document.getElementById("product-modal-backdrop");
    if (modalBackdrop) modalBackdrop.classList.remove("open");
};

window.orderModalProductViaWhatsApp = function (productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    const activeSizeBtn = document.querySelector("#modal-size-options .size-btn.active");
    const size = activeSizeBtn ? activeSizeBtn.innerText.trim() : product.sizes[0];

    incrementProductOrderTally(product.id);
    sendOrderLogToGoogleSheet({
        productId: product.id,
        productName: product.name,
        size: size,
        price: product.price,
        type: "whatsapp_modal"
    });

    const message = 
`السلام عليكم، أريد طلب هذا المنتج من متجر MAN:
━━━━━━━━━━━━━━━━━━━━
👔 *المنتج:* ${product.name}
📏 *المقاس المختار:* ${size}
💵 *السعر:* ${formatPrice(product.price)}
━━━━━━━━━━━━━━━━━━━━
هل المنتج متوفر لتأكيد الطلب والتوصيل لمحافظتي؟`;

    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encoded}`;
    
    const newWindow = window.open(whatsappUrl, "_blank");
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
        window.location.href = whatsappUrl;
    }

    setTimeout(() => renderBestSellers(), 1000);
};

// -----------------------------------------------------------------------------
// 13. إضافة المنتجات إلى سلة المشتريات وحفظها في localStorage
// -----------------------------------------------------------------------------
window.addProductToCart = function (btnElement) {
    const card = btnElement.closest(".product-card");
    if (!card) return;

    const productId = card.dataset.id;
    const product = productsData.find(p => p.id === productId);

    const titleEl = card.querySelector(".product-title");
    const activeSizeBtn = card.querySelector(".size-btn.active");
    const imgEl = card.querySelector(".product-img");

    const name = product ? product.name : (titleEl ? titleEl.innerText.trim() : "منتج رجالي");
    const price = product ? product.price : parseFloat(card.dataset.price) || 0;
    const size = activeSizeBtn ? activeSizeBtn.innerText.trim() : (product ? product.sizes[0] : "قياسي");
    const image = product ? product.image : (imgEl ? imgEl.src : "");

    const existing = cart.find(item => item.name === name && item.size === size);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id: productId, name, price, size, quantity: 1, image });
    }

    saveCartToStorage();
    renderCart();
    animateCartBadge();
    showToast(`تمت إضافة "${name}" (${size}) للسلة بنجاح 🛍️`);
};

window.addModalProductToCart = function (productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    const activeSizeBtn = document.querySelector("#modal-size-options .size-btn.active");
    const size = activeSizeBtn ? activeSizeBtn.innerText.trim() : product.sizes[0];

    const existing = cart.find(item => item.name === product.name && item.size === size);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            size: size,
            quantity: 1,
            image: product.image
        });
    }

    saveCartToStorage();
    renderCart();
    animateCartBadge();
    showToast(`تمت إضافة "${product.name}" (${size}) للسلة بنجاح 🛍️`);
    closeProductModal();
};

function animateCartBadge() {
    const badge = document.getElementById("cart-badge-count");
    if (badge) {
        badge.classList.add("bump");
        setTimeout(() => badge.classList.remove("bump"), 300);
    }
}

// -----------------------------------------------------------------------------
// 14. إدارة عناصر السلة، كوبونات الخصم، والحسابات الإجمالية
// -----------------------------------------------------------------------------
window.changeCartQty = function (index, delta) {
    if (cart[index]) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
            showToast("تم حذف المنتج من السلة");
        }
        saveCartToStorage();
        renderCart();
    }
};

window.removeCartProduct = function (index) {
    if (cart[index]) {
        const removed = cart[index].name;
        cart.splice(index, 1);
        saveCartToStorage();
        renderCart();
        showToast(`تم حذف "${removed}" من السلة`);
    }
};

// تطبيق كود الخصم الحقيقي مع فحص الحالة والحد الأدنى
window.applyCouponCode = function () {
    const input = document.getElementById("coupon-code-input");
    if (!input) return;

    const code = input.value.trim().toUpperCase();

    if (!code) {
        showToast("يرجى كتابة كود الخصم أولاً", "error");
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const coupon = storeCoupons[code];

    if (!coupon) {
        showToast("كود الخصم غير موجود! تأكد من كتابته بشكل صحيح.", "error");
        return;
    }

    // التحقق هل الكوبون ملغي أو معطل
    if (!coupon.active) {
        showToast(`عذراً، كود الخصم (${code}) ملغي أو غير مفعل حالياً من إدارة المتجر 🚫`, "error");
        return;
    }

    // التحقق من الحد الأدنى للطلب
    if (coupon.minOrder > 0 && subtotal < coupon.minOrder) {
        showToast(`هذا الكوبون يتطلب طلباً بحد أدنى ${formatPrice(coupon.minOrder)} (مجموعك الحالي: ${formatPrice(subtotal)})`, "error");
        return;
    }

    let percent = coupon.percent;
    if (percent > 0 && percent <= 1) {
        percent = Math.round(percent * 100);
    }

    activeCoupon = { ...coupon, percent: percent };
    saveCartToStorage();
    renderCart();
    showToast(`تم تفعيل كود الخصم (${code}) بنجاح! تم خصم ${percent}% 🎉`);
    input.value = "";
};

// إزالة كود الخصم
window.removeCoupon = function () {
    activeCoupon = null;
    saveCartToStorage();
    renderCart();
    showToast("تمت إزالة كود الخصم");
};

function renderCart() {
    const container = document.getElementById("cart-items-container");
    const badge = document.getElementById("cart-badge-count");
    const subtotalEl = document.getElementById("cart-subtotal");
    const shippingEl = document.getElementById("cart-shipping");
    const totalEl = document.getElementById("cart-total");
    const recapList = document.getElementById("checkout-recap-items");
    const recapTotal = document.getElementById("checkout-recap-total");
    const submitBtn = document.querySelector(".btn-submit");
    const discountRow = document.getElementById("cart-discount-row");
    const discountLabel = document.getElementById("cart-discount-label");
    const discountVal = document.getElementById("cart-discount-val");
    const couponTagContainer = document.getElementById("applied-coupon-tag-container");

    // تحديث عدد العناصر في شارة الترويسة
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) badge.innerText = count;

    // حساب الإجماليات
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // حساب الخصم الفعلي مع المراجعة التلقائية للحد الأدنى
    let discountAmount = 0;
    if (activeCoupon && subtotal > 0) {
        if (activeCoupon.minOrder > 0 && subtotal < activeCoupon.minOrder) {
            // إلغاء الكوبون تلقائياً إذا نزل المجموع عن الحد الأدنى بعد تعديل السلة
            activeCoupon = null;
            saveCartToStorage();
            showToast("تم إزالة الكوبون لأن المجموع أصبح أقل من الحد الأدنى للخصم", "error");
        } else {
            discountAmount = Math.round((subtotal * activeCoupon.percent) / 100);
        }
    } else if (subtotal === 0) {
        discountAmount = 0;
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const shipping = (subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0) ? 0 : DEFAULT_SHIPPING_FEE;
    const total = discountedSubtotal + shipping;

    if (subtotalEl) subtotalEl.innerText = formatPrice(subtotal);

    // إظهار أو إخفاء صف الخصم في ملخص السلة
    if (discountRow) {
        if (discountAmount > 0 && activeCoupon) {
            discountRow.style.display = "flex";
            if (discountLabel) discountLabel.innerText = `خصم الكوبون (${activeCoupon.code} - ${activeCoupon.percent}%)`;
            if (discountVal) discountVal.innerText = `-${formatPrice(discountAmount)}`;
        } else {
            discountRow.style.display = "none";
        }
    }

    // عرض شارة الكوبون المفعل مع إمكانية إزالته
    if (couponTagContainer) {
        if (activeCoupon && subtotal > 0) {
            couponTagContainer.innerHTML = `
                <div class="applied-coupon-tag">
                    <span>🏷️ الكوبون مفعل: <strong>${activeCoupon.code}</strong> (خصم ${activeCoupon.percent}%)</span>
                    <button type="button" class="remove-coupon-btn" onclick="removeCoupon()" title="إزالة الكوبون">✕</button>
                </div>
            `;
        } else {
            couponTagContainer.innerHTML = "";
        }
    }

    if (shippingEl) {
        shippingEl.innerText = (shipping === 0 && subtotal > 0) ? "مجاناً" : (subtotal === 0 ? "0 " + CURRENCY_LABEL : formatPrice(shipping));
        shippingEl.className = (shipping === 0 && subtotal > 0) ? "text-free" : "";
    }
    if (totalEl) totalEl.innerText = formatPrice(total);
    if (recapTotal) recapTotal.innerText = formatPrice(total);

    if (submitBtn) {
        submitBtn.innerHTML = `
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            تأكيد وإرسال الطلب عبر واتساب (${formatPrice(total)})
        `;
    }

    if (container) {
        if (cart.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    <p style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 8px;">سلة المشتريات فارغة</p>
                    <a href="#products" class="btn btn-secondary btn-sm" style="margin-top: 14px;">تصفح التشكيلة الآن</a>
                </div>
            `;
        } else {
            container.innerHTML = cart.map((item, index) => `
                <div class="cart-item">
                    <div class="cart-item-product">
                        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="cart-thumb">
                        <div class="cart-item-details">
                            <h4 class="cart-item-name">${escapeHtml(item.name)}</h4>
                            <span class="cart-item-meta">المقاس: ${escapeHtml(item.size)} | اللون: أسود ملكي</span>
                            <span class="cart-item-price-single">سعر القطعة: ${formatPrice(item.price)}</span>
                        </div>
                    </div>
                    <div class="cart-quantity-control">
                        <button type="button" class="qty-btn" onclick="changeCartQty(${index}, -1)" aria-label="تقليل">-</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button type="button" class="qty-btn" onclick="changeCartQty(${index}, 1)" aria-label="زيادة">+</button>
                    </div>
                    <div class="cart-item-total">${formatPrice(item.price * item.quantity)}</div>
                    <button type="button" class="remove-btn" onclick="removeCartProduct(${index})" title="حذف">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `).join("");
        }
    }

    if (recapList) {
        let recapHTML = cart.map(item => `
            <div class="recap-item">
                <span>${escapeHtml(item.name)} (${escapeHtml(item.size)}) × ${item.quantity}</span>
                <strong>${formatPrice(item.price * item.quantity)}</strong>
            </div>
        `).join("");

        if (discountAmount > 0 && activeCoupon) {
            recapHTML += `
                <div class="recap-item discount-row">
                    <span>خصم الكوبون (${activeCoupon.code})</span>
                    <strong class="text-discount">-${formatPrice(discountAmount)}</strong>
                </div>
            `;
        }

        recapList.innerHTML = recapHTML;
    }
}

// -----------------------------------------------------------------------------
// 15. ربط نموذج تأكيد الطلب، التحقق الصارم من الهاتف، وتفريغ السلة
// -----------------------------------------------------------------------------
function setupOrderForm() {
    const orderForm = document.getElementById("order-form");
    if (!orderForm) return;

    orderForm.addEventListener("submit", (e) => {
        e.preventDefault();

        if (cart.length === 0) {
            showToast("سلة المشتريات فارغة! اختر منتجات من التشكيلة أولاً.", "error");
            window.location.hash = "#products";
            return;
        }

        const name = document.getElementById("full-name").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const citySelect = document.getElementById("city");
        const city = citySelect.options[citySelect.selectedIndex]?.text || "مصر";
        const district = document.getElementById("district").value.trim();
        const address = document.getElementById("address").value.trim();
        const notes = document.getElementById("notes").value.trim();

        // التحقق من صحة رقم الهاتف المصري (11 رقم يبدأ بـ 01)
        const egyptianPhonePattern = /^01[0125][0-9]{8}$/;
        if (!egyptianPhonePattern.test(phone)) {
            showToast("يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01 ومكون من 11 رقماً", "error");
            document.getElementById("phone").focus();
            return;
        }

        const selectedPayment = document.querySelector('input[name="payment_method"]:checked');
        let paymentText = "الدفع عند الاستلام (COD)";
        if (selectedPayment) {
            if (selectedPayment.value === "wallet") paymentText = "إنستاباي / محفظة ذكية (فودافون كاش)";
            if (selectedPayment.value === "online") paymentText = "بطاقة بنكية / فيزا / ميزة";
        }

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let discountAmount = 0;
        if (activeCoupon && subtotal > 0) {
            discountAmount = Math.round((subtotal * activeCoupon.percent) / 100);
        }
        const discountedSubtotal = Math.max(0, subtotal - discountAmount);
        const shipping = (subtotal >= FREE_SHIPPING_THRESHOLD) ? 0 : DEFAULT_SHIPPING_FEE;
        const total = discountedSubtotal + shipping;

        const itemsText = cart.map((item, idx) => 
            `${idx + 1}) *${item.name}*\n   ▫️ المقاس: ${item.size}\n   ▫️ الكمية: ${item.quantity}\n   ▫️ السعر: ${formatPrice(item.price * item.quantity)}`
        ).join("\n\n");

        // زيادة عداد طلب المنتجات
        cart.forEach(item => {
            incrementProductOrderTally(item.id);
        });

        // إرسال الطلب في الخلفية لشيت جوجل
        sendOrderLogToGoogleSheet({
            name: name,
            phone: phone,
            city: city,
            address: `${district} - ${address}`,
            payment: paymentText,
            itemsText: cart.map(i => `${i.name} [${i.size}] x${i.quantity}`).join(" | "),
            coupon: activeCoupon ? `${activeCoupon.code} (-${activeCoupon.percent}%)` : "لا يوجد",
            total: formatPrice(total),
            notes: notes
        });

        // رسالة الواتساب الرسمية المنسقة
        const fullMessage = 
`🛍️ *طلب جديد من متجر MAN*
━━━━━━━━━━━━━━━━━━━━
👤 *بيانات العميل:*
• الاسم: ${name}
• الهاتف: ${phone}
• المحافظة: ${city}
• العنوان التفصيلي: ${district} - ${address}
• طريقة الدفع: ${paymentText}
${notes ? `• ملاحظات: ${notes}\n` : ""}
📦 *تفاصيل المنتجات:*
${itemsText}

━━━━━━━━━━━━━━━━━━━━
💵 *المجموع الفرعي:* ${formatPrice(subtotal)}
${discountAmount > 0 ? `🏷️ *خصم الكوبون (${activeCoupon.code}):* -${formatPrice(discountAmount)}\n` : ""}🚚 *الشحن والتوصيل:* ${shipping === 0 ? "مجاني" : formatPrice(shipping)}
💰 *الإجمالي المستحق:* ${formatPrice(total)}
━━━━━━━━━━━━━━━━━━━━
يرجى تأكيد استلام الطلب وتجهيز الشحن.`;

        const encoded = encodeURIComponent(fullMessage);
        const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encoded}`;
        
        const newWin = window.open(url, "_blank");
        if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {
            window.location.href = url;
        }

        // تفريغ السلة وتحديث الواجهة وإعادة تعيين النموذج
        cart = [];
        activeCoupon = null;
        saveCartToStorage();
        renderCart();
        orderForm.reset();

        showToast("تم إرسال الطلب بنجاح وتفريغ السلة! جاري توجيهك إلى واتساب... 🚀");
        setTimeout(() => renderBestSellers(), 1000);
    });
}

// -----------------------------------------------------------------------------
// 16. إرسال سجل الطلبات تلقائياً لشيت Google بالخلفية
// -----------------------------------------------------------------------------
function sendOrderLogToGoogleSheet(orderData) {
    if (!GOOGLE_SHEET_API_URL || GOOGLE_SHEET_API_URL.trim() === "" || GOOGLE_SHEET_API_URL.includes("AKfycbz...")) {
        return;
    }

    try {
        fetch(GOOGLE_SHEET_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        }).catch(err => console.log("Google Sheets logging silently handled:", err));
    } catch (e) {
        // تجاهل أي خطأ خلفي لعدم تعطيل العميل
    }
}

// -----------------------------------------------------------------------------
// 17. إعداد قائمة الموبايل المنبثقة (Hamburger Drawer Setup)
// -----------------------------------------------------------------------------
function setupMobileMenu() {
    const toggleBtn = document.getElementById("mobile-menu-toggle");
    const closeBtn = document.getElementById("mobile-menu-close");
    const drawer = document.getElementById("mobile-nav-drawer");
    const backdrop = document.getElementById("mobile-nav-backdrop");

    if (!toggleBtn || !drawer || !backdrop) return;

    function openMobileMenu() {
        drawer.classList.add("open");
        backdrop.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeMobileMenu() {
        drawer.classList.remove("open");
        backdrop.classList.remove("open");
        document.body.style.overflow = "";
    }

    toggleBtn.addEventListener("click", openMobileMenu);
    if (closeBtn) closeBtn.addEventListener("click", closeMobileMenu);
    backdrop.addEventListener("click", closeMobileMenu);

    // إغلاق القائمة عند النقر على أي رابط بها
    const links = drawer.querySelectorAll(".mobile-link");
    links.forEach(link => {
        link.addEventListener("click", () => {
            closeMobileMenu();
        });
    });

    // إغلاق بزر Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && drawer.classList.contains("open")) {
            closeMobileMenu();
        }
    });
}

// -----------------------------------------------------------------------------
// 18. إعداد Event Delegation لأزرار تصنيفات الفئات (أمان كامل ضد علامات التنصيص)
// -----------------------------------------------------------------------------
function setupCategoryFilterEvents() {
    const filterContainer = document.getElementById("category-filters");
    if (!filterContainer) return;

    filterContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".filter-btn");
        if (btn && btn.dataset.category) {
            setCategoryFilter(btn.dataset.category);
        }
    });
}

// -----------------------------------------------------------------------------
// 19. نظام التنبيهات المرئية السريعة (Toast)
// -----------------------------------------------------------------------------
function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === "success" ? "✓" : "!"}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 250);
    }, 2800);
}

// -----------------------------------------------------------------------------
// 20. عند اكتمال تحميل الصفحة (DOMContentLoaded)
// -----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    // 1. استرجاع السلة والكوبونات من localStorage
    loadCartFromStorage();

    // 2. تحديث وتوحيد أرقام وروابط الواتساب ديناميكياً
    syncWhatsAppLinks();

    // 3. تهيئة قائمة الموبايل المنبثقة
    setupMobileMenu();

    // 4. تهيئة أحداث أزرار الفئات (Event Delegation)
    setupCategoryFilterEvents();

    // 5. جلب المنتجات (من جوجل شيت أو الاحتياطية)
    fetchProductsFromGoogleSheet();

    // 6. رسم السلة وتحديث الإجماليات
    renderCart();

    // 7. تهيئة نموذج الطلب والتحقق من الهاتف
    setupOrderForm();

    // 8. إغلاق النوافذ المنبثقة بالخلفية أو زر Escape
    const modalBackdrop = document.getElementById("product-modal-backdrop");
    if (modalBackdrop) {
        modalBackdrop.addEventListener("click", (e) => {
            if (e.target === modalBackdrop) closeProductModal();
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeProductModal();
        }
    });
});
