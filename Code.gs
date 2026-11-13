/**
 * ==============================================================================
 * MAN STORE - GOOGLE APPS SCRIPT (Code.gs)
 * تحويل بيانات المنتجات والكوبونات من Google Sheets إلى JSON API
 * وإدارة العروض وتوثيق الطلبات تلقائياً
 * ==============================================================================
 */

// 1. قراءة المنتجات والكوبونات وتمريرها للمتجر عبر GET Request
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // -------------------------------------------------------------
    // أ) قراءة المنتجات من شيت "المنتجات"
    // -------------------------------------------------------------
    let productSheet = ss.getSheetByName("المنتجات") || ss.getActiveSheet();
    const productData = productSheet.getDataRange().getValues();
    const products = [];

    if (productData.length > 1) {
      const rawHeaders = productData[0];
      const headers = rawHeaders.map(h => normalizeHeader(String(h)));

      for (let i = 1; i < productData.length; i++) {
        const row = productData[i];
        if (!row || row.every(cell => cell === "" || cell === null)) continue;

        let item = {};
        headers.forEach((key, colIndex) => {
          if (key) item[key] = row[colIndex];
        });

        const name = String(item.name || "").trim();
        if (!name) continue;

        const price = parseFloat(item.price) || 0;
        const oldPrice = item.oldPrice ? parseFloat(item.oldPrice) : null;
        
        let sizes = [];
        if (item.sizes) {
          sizes = String(item.sizes).split(/[,،\/\-]/).map(s => s.trim()).filter(Boolean);
        }
        if (sizes.length === 0) sizes = ["M", "L", "XL", "XXL"];

        const bestSellerVal = String(item.isBestSeller || "").toLowerCase().trim();
        const isBestSeller = (bestSellerVal === "true" || bestSellerVal === "yes" || bestSellerVal === "نعم" || bestSellerVal === "1" || item.isBestSeller === true);

        const ordersCount = parseInt(item.ordersCount) || 0;
        let image = String(item.image || "").trim() || "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800";
        let category = String(item.category || "أخرى").trim();

        products.push({
          id: item.id ? String(item.id).trim() : "prod-" + i,
          name: name,
          category: category,
          price: price,
          oldPrice: (oldPrice && oldPrice > price) ? oldPrice : null,
          image: image,
          sizes: sizes,
          selectedSize: sizes[0],
          isBestSeller: isBestSeller,
          ordersCount: ordersCount,
          rating: item.rating ? String(item.rating).trim() : "★★★★★ (45 تقييم)",
          description: item.description ? String(item.description).trim() : "خامات فاخرة عالية الجودة صُممت لتمنحك الأناقة والراحة المطلقة."
        });
      }
    }

    // -------------------------------------------------------------
    // ب) قراءة الكوبونات من شيت "الكوبونات" (مع دعم كافة أسماء التبويبات والأعمدة)
    // -------------------------------------------------------------
    let couponSheet = ss.getSheetByName("الكوبونات");
    if (!couponSheet) {
      // البحث التلقائي عن أي صفحة تحتوي على كلمة كوبون أو خصم
      const allSheets = ss.getSheets();
      for (let s = 0; s < allSheets.length; s++) {
        const sName = allSheets[s].getName().trim().toLowerCase();
        if (sName.includes("كوبون") || sName.includes("coupon") || sName.includes("خصم")) {
          couponSheet = allSheets[s];
          break;
        }
      }
    }

    if (!couponSheet) {
      try {
        couponSheet = ss.insertSheet("الكوبونات");
        couponSheet.appendRow(["كود الكوبون", "نسبة الخصم %", "الحالة (مفعل / معطل)", "وصف الكوبون", "الحد الأدنى للطلب (ج.م)"]);
        couponSheet.appendRow(["MAN20", 20, "مفعل", "خصم 20% لعملاء MAN", 0]);
        couponSheet.appendRow(["WELCOME", 15, "مفعل", "خصم ترحيبي 15%", 300]);
        couponSheet.appendRow(["EGYPT10", 10, "مفعل", "خصم 10% لكافة المحافظات", 0]);
        couponSheet.appendRow(["SUMMER30", 30, "معطل", "خصم الصيف (ملغي مؤقتاً)", 600]);
        couponSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#121215").setFontColor("#ffffff");
      } catch (err) {
        Logger.log("تعذر إنشاء شيت الكوبونات تلقائياً: " + err);
      }
    }

    const coupons = [];

    if (couponSheet) {
      const couponData = couponSheet.getDataRange().getValues();

      if (couponData.length > 1) {
        const cHeaders = couponData[0].map(h => normalizeCouponHeader(String(h)));

        for (let j = 1; j < couponData.length; j++) {
          const cRow = couponData[j];
          if (!cRow || cRow.every(c => c === "" || c === null)) continue;

          let cItem = {};
          cHeaders.forEach((key, colIdx) => {
            if (key) cItem[key] = cRow[colIdx];
          });

          // استخراج الكود (سواء من اسم العمود أو العمود الأول كاحتياط)
          let code = String(cItem.code || cRow[0] || "").trim().toUpperCase();
          if (!code || code === "الكود" || code === "كود" || code === "كود الكوبون" || code === "CODE") continue;

          // استخراج نسبة الخصم ومعالجة التنسيق المئوي (75 أو 75% أو 0.75)
          let rawPercent = cItem.percent !== undefined && cItem.percent !== "" ? cItem.percent : cRow[1];
          let percent = 0;
          if (typeof rawPercent === "number") {
            if (rawPercent > 0 && rawPercent <= 1) {
              percent = Math.round(rawPercent * 100);
            } else {
              percent = Math.round(rawPercent);
            }
          } else {
            const cleaned = String(rawPercent || "").replace(/[%٪]/g, "").trim();
            const parsed = parseFloat(cleaned) || 0;
            if (parsed > 0 && parsed <= 1) {
              percent = Math.round(parsed * 100);
            } else {
              percent = Math.round(parsed);
            }
          }

          // استخراج الحالة
          let statusRaw = String(cItem.status !== undefined && cItem.status !== "" ? cItem.status : (cRow[2] || "مفعل")).trim().toLowerCase();
          const active = !(
            statusRaw === "معطل" ||
            statusRaw === "ملغي" ||
            statusRaw === "غير مفعل" ||
            statusRaw === "متوقف" ||
            statusRaw === "لا" ||
            statusRaw === "false" ||
            statusRaw === "0" ||
            statusRaw === "disabled" ||
            statusRaw === "inactive"
          );

          // الحد الأدنى والوصف
          let minOrderRaw = cItem.minOrder !== undefined && cItem.minOrder !== "" ? cItem.minOrder : (cRow[4] || 0);
          const minOrder = parseFloat(minOrderRaw) || 0;
          const desc = String(cItem.desc || cRow[3] || `خصم ${percent}%`).trim();

          coupons.push({
            code: code,
            percent: percent,
            active: active,
            status: active ? "مفعل" : "معطل",
            desc: desc,
            minOrder: minOrder
          });
        }
      }
    }

    return createJsonResponse({
      status: "success",
      count: products.length,
      data: products,
      coupons: coupons
    });

  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

// 2. استقبال الطلبات وتسجيلها في شيت "الطلبات" تلقائياً
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let orderSheet = ss.getSheetByName("الطلبات");
    
    if (!orderSheet) {
      orderSheet = ss.insertSheet("الطلبات");
      orderSheet.appendRow([
        "التاريخ والوقت",
        "اسم العميل",
        "رقم الهاتف",
        "المحافظة",
        "العنوان بالتفصيل",
        "طريقة الدفع",
        "المنتجات المطلوبة",
        "الكوبون المستخدم",
        "الإجمالي (ج.م)",
        "ملاحظات"
      ]);
      orderSheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#121215").setFontColor("#ffffff");
    }

    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (ex) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    // تسجيل الطلب
    orderSheet.appendRow([
      new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" }),
      payload.name || "عميل واتساب",
      payload.phone || "-",
      payload.city || "-",
      payload.address || "-",
      payload.payment || "الدفع عند الاستلام",
      payload.itemsText || "-",
      payload.coupon || "لا يوجد",
      payload.total || "-",
      payload.notes || ""
    ]);

    if (payload.productId) {
      incrementProductOrdersCount(ss, payload.productId);
    }

    return createJsonResponse({ status: "success", message: "تم تسجيل الطلب بنجاح" });

  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

// زيادة عداد طلب المنتج
function incrementProductOrdersCount(ss, productId) {
  try {
    const sheet = ss.getSheetByName("المنتجات") || ss.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => normalizeHeader(String(h)));
    const idCol = headers.indexOf("id");
    const nameCol = headers.indexOf("name");
    const ordersCol = headers.indexOf("ordersCount");

    if (ordersCol === -1) return;

    for (let r = 1; r < data.length; r++) {
      const rowId = idCol !== -1 ? String(data[r][idCol]) : "";
      const rowName = nameCol !== -1 ? String(data[r][nameCol]) : "";

      if (rowId === String(productId) || rowName === String(productId)) {
        const currentCount = parseInt(data[r][ordersCol]) || 0;
        sheet.getRange(r + 1, ordersCol + 1).setValue(currentCount + 1);
        break;
      }
    }
  } catch (e) {
    Logger.log("خطأ في تحديث عداد الطلب: " + e);
  }
}

// توحيد عناوين أعمدة المنتجات
function normalizeHeader(header) {
  const h = header.trim().toLowerCase();
  if (h === "id" || h === "كود" || h === "معرف") return "id";
  if (h === "name" || h === "اسم المنتج" || h === "الاسم" || h === "المنتج") return "name";
  if (h === "category" || h === "القسم" || h === "الفئة" || h === "التصنيف") return "category";
  if (h === "price" || h === "السعر" || h === "السعر الحالي") return "price";
  if (h === "oldprice" || h === "السعر القديم" || h === "السعر قبل الخصم") return "oldPrice";
  if (h === "image" || h === "الصورة" || h === "رابط الصورة") return "image";
  if (h === "sizes" || h === "المقاسات" || h === "المقاس") return "sizes";
  if (h === "isbestseller" || h === "الأكثر مبيعاً" || h === "الاكثر مبيعا" || h === "الأكثر طلباً") return "isBestSeller";
  if (h === "orderscount" || h === "عدد الطلبات" || h === "مرات الطلب") return "ordersCount";
  if (h === "rating" || h === "التقييم") return "rating";
  if (h === "description" || h === "الوصف" || h === "تفاصيل") return "description";
  return h;
}

// توحيد عناوين أعمدة الكوبونات بمرونة كاملة
function normalizeCouponHeader(header) {
  const h = String(header || "").trim().toLowerCase();
  if (h.includes("كود") || h.includes("رمز") || h.includes("code") || h.includes("coupon")) return "code";
  if (h.includes("نسب") || h.includes("خصم") || h.includes("percent") || h.includes("discount") || h.includes("%") || h.includes("٪")) return "percent";
  if (h.includes("حال") || h.includes("status") || h.includes("مفعل") || h.includes("نشط")) return "status";
  if (h.includes("وصف") || h.includes("desc") || h.includes("ملاحظ") || h.includes("تفاصيل")) return "desc";
  if (h.includes("ادن") || h.includes("أدن") || h.includes("اقل") || h.includes("أقل") || h.includes("min") || h.includes("حد")) return "minOrder";
  return h;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
