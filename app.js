// ================= ARF FOOD MACHINERY ERP - APP.JS =================

let machines = JSON.parse(localStorage.getItem('arf_machines_clean')) || [];
let leads = JSON.parse(localStorage.getItem('arf_leads_clean')) || [];
let docs = JSON.parse(localStorage.getItem('arf_docs_clean')) || [];
let currentDocFilter = 'All';

function saveAll() {
    localStorage.setItem('arf_machines_clean', JSON.stringify(machines));
    localStorage.setItem('arf_leads_clean', JSON.stringify(leads));
    localStorage.setItem('arf_docs_clean', JSON.stringify(docs));
    updateKPIs();
}

function clearAllData() {
    if (confirm("Are you sure you want to delete all Leads, Machines, and Bills?")) {
        machines = [];
        leads = [];
        docs = [];
        saveAll();
        renderAll();
    }
}

function formatINR(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
}

function calcDocTotals(doc) {
    const subTotal = doc.items.reduce((sum, i) => sum + (Number(i.price) * Number(i.qty)), 0);
    const taxable = subTotal + Number(doc.freight || 0);
    const gstAmt = Math.round(taxable * (Number(doc.gstRate || 0) / 100));
    const grandTotal = taxable + gstAmt;
    return { subTotal, taxable, gstAmt, grandTotal };
}

function updateKPIs() {
    document.getElementById('kpi-leads').innerText = leads.length;
    const totalUnits = machines.reduce((s, m) => s + Number(m.stock || 0), 0);
    document.getElementById('kpi-stock').innerText = totalUnits + ' Units';
    document.getElementById('badge-stock').innerText = machines.length;
    document.getElementById('badge-docs').innerText = docs.length;

    const quotePIValue = docs.filter(d => d.type !== 'Tax Invoice').reduce((s, d) => s + calcDocTotals(d).grandTotal, 0);
    const billedValue = docs.filter(d => d.type === 'Tax Invoice').reduce((s, d) => s + calcDocTotals(d).grandTotal, 0);

    document.getElementById('kpi-quotes').innerText = formatINR(quotePIValue);
    document.getElementById('kpi-billed').innerText = formatINR(billedValue);
}

function switchTab(tab) {
    ['dashboard', 'inventory', 'billing'].forEach(t => {
        document.getElementById('tab-' + t).classList.add('hidden');
        const nav = document.getElementById('nav-' + t);
        if (nav) nav.className = "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-slate-800/70 text-slate-400 hover:text-white font-semibold text-xs transition";
    });

    document.getElementById('tab-' + tab).classList.remove('hidden');
    const activeNav = document.getElementById('nav-' + tab);
    if (activeNav) activeNav.className = "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-orange-500/15 text-orange-400 font-semibold text-xs transition";

    const titles = {
        dashboard: "Machinery Sales & Leads CRM",
        inventory: "Food Processing Machinery Inventory",
        billing: "Quotations, Proforma Invoices (PI) & GST Bills"
    };
    document.getElementById('pageTitle').innerText = titles[tab];
}

// Render Leads
function renderLeads() {
    const q = document.getElementById('leadSearch').value.toLowerCase();
    const status = document.getElementById('leadStatusFilter').value;
    const tbody = document.getElementById('leadTableBody');
    tbody.innerHTML = '';

    const badgeColors = {
        'New Inquiry': 'bg-blue-50 text-blue-700 border-blue-200',
        'Quotation Sent': 'bg-purple-50 text-purple-700 border-purple-200',
        'PI Issued': 'bg-amber-50 text-amber-700 border-amber-200',
        'Order Confirmed': 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };

    const filtered = leads.filter(l => {
        const mQ = l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.machine.toLowerCase().includes(q);
        const mS = status === 'All' || l.status === status;
        return mQ && mS;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400">No inquiries added yet. Click <strong>"+ Add Buyer Lead"</strong> to add your first customer inquiry.</td></tr>`;
        return;
    }

    filtered.forEach(l => {
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50">
                <td class="py-3.5 px-5">
                    <p class="font-bold text-slate-800">${l.name}</p>
                    <p class="text-[11px] text-slate-400">${l.company}</p>
                </td>
                <td class="py-3.5 px-4">
                    <div class="flex items-center gap-1.5">
                        <a href="https://wa.me/91${l.phone.replace(/\D/g,'')}" target="_blank" class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center"><i class="fa-brands fa-whatsapp"></i></a>
                        <span>${l.phone}</span>
                    </div>
                </td>
                <td class="py-3.5 px-4 font-semibold text-slate-700">${l.machine}</td>
                <td class="py-3.5 px-4 font-bold">${formatINR(l.budget)}</td>
                <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeColors[l.status] || badgeColors['New Inquiry']}">${l.status}</span>
                </td>
                <td class="py-3.5 px-5 text-right space-x-1">
                    <button onclick="quickQuoteFromLead(${l.id})" class="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-semibold text-[11px]">
                        <i class="fa-solid fa-file-invoice mr-1"></i> Make Quote/PI
                    </button>
                    <button onclick="deleteLead(${l.id})" class="text-slate-400 hover:text-rose-600 p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// Render Machine Inventory
function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';

    if (machines.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-slate-400">Inventory is empty. Click <strong>"Add Machine to Inventory"</strong> to add your food processing machines.</td></tr>`;
        return;
    }

    machines.forEach(m => {
        const stockBadge = m.stock <= 2
            ? `<span class="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full font-bold text-[11px]">Low: ${m.stock} Units</span>`
            : `<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[11px]">${m.stock} Units Ready</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50">
                <td class="py-3.5 px-5">
                    <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">${m.sku}</span>
                    <p class="font-bold text-slate-800 mt-1">${m.name}</p>
                </td>
                <td class="py-3.5 px-4 text-slate-500 font-medium">${m.cat}</td>
                <td class="py-3.5 px-4 text-slate-600">${m.spec}</td>
                <td class="py-3.5 px-4 font-mono text-slate-500">${m.hsn}</td>
                <td class="py-3.5 px-4 font-bold text-slate-800">${formatINR(m.price)}</td>
                <td class="py-3.5 px-4">${stockBadge}</td>
                <td class="py-3.5 px-5 text-right space-x-1">
                    <button onclick="adjustStock(${m.id}, 1)" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded font-bold" title="Add Stock">+</button>
                    <button onclick="adjustStock(${m.id}, -1)" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded font-bold" title="Reduce Stock">-</button>
                    <button onclick="deleteMachine(${m.id})" class="text-slate-400 hover:text-rose-600 p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function adjustStock(id, delta) {
    const m = machines.find(x => x.id === id);
    if (m) {
        m.stock = Math.max(0, Number(m.stock) + delta);
        saveAll();
        renderInventory();
    }
}

// Render Quotations, PI & Bills
function filterDocs(type) {
    currentDocFilter = type;
    renderDocs();
}

function renderDocs() {
    const tbody = document.getElementById('docTableBody');
    tbody.innerHTML = '';

    const typeStyles = {
        'Quotation': 'bg-blue-50 text-blue-700 border-blue-200',
        'Proforma Invoice': 'bg-amber-50 text-amber-700 border-amber-200',
        'Tax Invoice': 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };

    const filtered = docs.filter(d => currentDocFilter === 'All' || d.type === currentDocFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400">No Quotations, PI, or Bills generated yet. Click <strong>"+ New Quotation / PI / Bill"</strong> above.</td></tr>`;
        return;
    }

    filtered.forEach(d => {
        const totals = calcDocTotals(d);
        const itemSummary = d.items.map(i => `${i.name} (x${i.qty})`).join(', ');

        let convertBtn = '';
        if (d.type === 'Quotation') {
            convertBtn = `<button onclick="convertDoc(${d.id}, 'Proforma Invoice')" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-semibold text-[11px]" title="Convert Quote to PI">➔ Make PI</button>`;
        } else if (d.type === 'Proforma Invoice') {
            convertBtn = `<button onclick="convertDoc(${d.id}, 'Tax Invoice')" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-[11px]" title="Convert PI to Final GST Bill">➔ Make Final Bill</button>`;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50">
                <td class="py-3.5 px-5">
                    <p class="font-bold text-slate-800">${d.docNo}</p>
                    <p class="text-[11px] text-slate-400">${d.date}</p>
                </td>
                <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold border ${typeStyles[d.type]}">${d.type}</span>
                </td>
                <td class="py-3.5 px-4">
                    <p class="font-bold text-slate-800">${d.client}</p>
                    <p class="text-[11px] text-slate-400">${d.address}</p>
                </td>
                <td class="py-3.5 px-4 max-w-xs truncate font-medium text-slate-600" title="${itemSummary}">${itemSummary}</td>
                <td class="py-3.5 px-4 font-extrabold text-slate-900">${formatINR(totals.grandTotal)}</td>
                <td class="py-3.5 px-5 text-right space-x-1">
                    ${convertBtn}
                    <button onclick="previewDoc(${d.id})" class="px-2.5 py-1 bg-slate-900 hover:bg-slate-700 text-white rounded-lg font-semibold text-[11px]">
                        <i class="fa-solid fa-print mr-1"></i> Print / PDF
                    </button>
                    <button onclick="deleteDoc(${d.id})" class="text-slate-400 hover:text-rose-600 p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function convertDoc(id, targetType) {
    const orig = docs.find(d => d.id === id);
    if (!orig) return;

    const prefix = targetType === 'Proforma Invoice' ? 'ARF/PI/2026/' : 'ARF/INV/2026/';
    const newDoc = JSON.parse(JSON.stringify(orig));
    newDoc.id = Date.now();
    newDoc.type = targetType;
    newDoc.date = new Date().toISOString().slice(0, 10);
    newDoc.docNo = prefix + String(docs.length + 1).padStart(2, '0');

    if (targetType === 'Tax Invoice') {
        newDoc.items.forEach(item => {
            const invMachine = machines.find(m => m.sku === item.sku);
            if (invMachine && invMachine.stock >= item.qty) {
                invMachine.stock -= item.qty;
            }
        });
    }

    docs.unshift(newDoc);
    saveAll();
    renderAll();
    previewDoc(newDoc.id);
}

function openDocModal(defaultType = 'Quotation', prefillLead = null) {
    document.getElementById('docForm').reset();
    document.getElementById('d_type').value = defaultType;
    document.getElementById('docItemsContainer').innerHTML = '';

    if (prefillLead) {
        document.getElementById('d_client').value = prefillLead.company || prefillLead.name;
        document.getElementById('d_phone').value = prefillLead.phone;
        document.getElementById('d_address').value = prefillLead.company;
        addDocItemRow(prefillLead.machine, prefillLead.budget);
    } else {
        addDocItemRow();
    }

    const m = document.getElementById('docModal');
    m.classList.remove('hidden');
    m.classList.add('flex');
}

function addDocItemRow(prefillName = '', prefillPrice = '') {
    const container = document.getElementById('docItemsContainer');
    const invOptions = `<option value="">-- Choose from Inventory (Optional) --</option>` +
        machines.map(m => `<option value="${m.id}">${m.sku} - ${m.name} (${formatINR(m.price)})</option>`).join('');

    const row = document.createElement('div');
    row.className = "p-2.5 bg-white border border-slate-200 rounded-xl space-y-2 doc-item-row";
    row.innerHTML = `
        <div class="flex justify-between items-center gap-2">
            <select onchange="syncRowPrice(this)" class="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 machine-select">
                ${invOptions}
            </select>
            <button type="button" onclick="this.closest('.doc-item-row').remove()" class="text-rose-500 hover:text-rose-700 px-2"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div class="grid grid-cols-12 gap-2">
            <input type="text" value="${prefillName}" required placeholder="Machine Name & Model *" class="col-span-5 border border-slate-200 rounded-lg px-2.5 py-1.5 item-name">
            <input type="text" placeholder="Spec (e.g. 5HP SS)" class="col-span-3 border border-slate-200 rounded-lg px-2.5 py-1.5 item-spec">
            <input type="number" value="1" min="1" required placeholder="Qty" class="col-span-2 border border-slate-200 rounded-lg px-2.5 py-1.5 item-qty">
            <input type="number" value="${prefillPrice}" required placeholder="Rate (₹) *" class="col-span-2 border border-slate-200 rounded-lg px-2.5 py-1.5 item-price">
        </div>
    `;
    container.appendChild(row);
}

function syncRowPrice(selectEl) {
    const m = machines.find(x => x.id === Number(selectEl.value));
    const row = selectEl.closest('.doc-item-row');
    if (m) {
        row.querySelector('.item-name').value = `${m.name} (${m.sku})`;
        row.querySelector('.item-spec').value = m.spec;
        row.querySelector('.item-price').value = m.price;
        row.dataset.sku = m.sku;
        row.dataset.hsn = m.hsn;
    }
}

document.getElementById('docForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const type = document.getElementById('d_type').value;
    const prefixMap = { 'Quotation': 'ARF/QTN/2026/', 'Proforma Invoice': 'ARF/PI/2026/', 'Tax Invoice': 'ARF/INV/2026/' };

    const rows = document.querySelectorAll('.doc-item-row');
    const items = [];
    rows.forEach(r => {
        const name = r.querySelector('.item-name').value.trim();
        const spec = r.querySelector('.item-spec').value.trim() || 'Standard Grade';
        const qty = Number(r.querySelector('.item-qty').value || 1);
        const price = Number(r.querySelector('.item-price').value || 0);
        const sku = r.dataset.sku || 'ARF-MCH';
        const hsn = r.dataset.hsn || '8438';

        if (name) {
            items.push({ sku, name, spec, hsn, qty, price });
            if (type === 'Tax Invoice') {
                const invM = machines.find(x => x.sku === sku);
                if (invM && invM.stock >= qty) invM.stock -= qty;
            }
        }
    });

    const newDoc = {
        id: Date.now(),
        docNo: prefixMap[type] + String(docs.length + 1).padStart(2, '0'),
        date: new Date().toISOString().slice(0, 10),
        type,
        client: document.getElementById('d_client').value.trim(),
        gstin: document.getElementById('d_gstin').value.trim() || 'Unregistered',
        address: document.getElementById('d_address').value.trim(),
        phone: document.getElementById('d_phone').value.trim(),
        items,
        freight: Number(document.getElementById('d_freight').value || 0),
        gstRate: Number(document.getElementById('d_gst').value || 18),
        terms: document.getElementById('d_terms').value.trim()
    };

    docs.unshift(newDoc);
    saveAll();
    closeModal('docModal');
    switchTab('billing');
    renderAll();
    previewDoc(newDoc.id);
});

function previewDoc(id) {
    const d = docs.find(x => x.id === id);
    if (!d) return;
    const t = calcDocTotals(d);

    const rowsHTML = d.items.map((item, idx) => `
        <tr class="border-b border-slate-200">
            <td class="py-2.5 px-3 text-center">${idx + 1}</td>
            <td class="py-2.5 px-3">
                <p class="font-bold text-slate-800">${item.name}</p>
                <p class="text-[11px] text-slate-500">Spec: ${item.spec}</p>
            </td>
            <td class="py-2.5 px-3 text-center font-mono">${item.hsn}</td>
            <td class="py-2.5 px-3 text-center font-bold">${item.qty} Nos</td>
            <td class="py-2.5 px-3 text-right">${formatINR(item.price)}</td>
            <td class="py-2.5 px-3 text-right font-bold">${formatINR(item.price * item.qty)}</td>
        </tr>
    `).join('');

    document.getElementById('printArea').innerHTML = `
        <div class="border-2 border-slate-800 p-6 rounded-lg">
            <div class="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                <div>
                    <h1 class="text-xl font-extrabold text-slate-900 tracking-tight">ARF FOOD PROCESSING MACHINERY</h1>
                    <p class="text-xs text-slate-600">Manufacturers & Suppliers of Commercial Food Processing Machines</p>
                    <p class="text-xs font-bold text-slate-800 mt-1">GSTIN: 09AAACA1234A1Z5</p>
                </div>
                <div class="text-right">
                    <span class="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-sm uppercase tracking-wider rounded">${d.type}</span>
                    <p class="font-bold text-slate-800 mt-2">Doc No: ${d.docNo}</p>
                    <p class="text-slate-500">Date: ${d.date}</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 py-4 border-b border-slate-300">
                <div>
                    <p class="text-[10px] font-bold uppercase text-slate-400">Billed / Quoted To:</p>
                    <p class="font-bold text-sm text-slate-900 mt-0.5">${d.client}</p>
                    <p class="text-slate-600">${d.address}</p>
                    <p class="text-slate-600 mt-0.5">Phone: ${d.phone}</p>
                    <p class="font-bold text-slate-800 mt-0.5">Party GSTIN: ${d.gstin}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] font-bold uppercase text-slate-400">Terms & Conditions:</p>
                    <p class="text-slate-700 font-medium mt-0.5">${d.terms}</p>
                    <p class="text-slate-500 mt-1">1 Year Standard Manufacturing Warranty</p>
                </div>
            </div>

            <table class="w-full text-left border-collapse my-4">
                <thead>
                    <tr class="bg-slate-100 border-y border-slate-300 text-[11px] font-bold uppercase text-slate-700">
                        <th class="py-2 px-3 text-center">S.No</th>
                        <th class="py-2 px-3">Machine Description & Specifications</th>
                        <th class="py-2 px-3 text-center">HSN</th>
                        <th class="py-2 px-3 text-center">Qty</th>
                        <th class="py-2 px-3 text-right">Unit Rate</th>
                        <th class="py-2 px-3 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>${rowsHTML}</tbody>
            </table>

            <div class="grid grid-cols-12 gap-6 pt-3 border-t-2 border-slate-800">
                <div class="col-span-7 space-y-1 text-[11px]">
                    <p class="font-bold text-slate-800 uppercase">Company Bank Details (For RTGS / NEFT):</p>
                    <p>Account Name: <strong>ARF FOOD MACHINERY</strong></p>
                    <p>Account No / IFSC: <strong>As per official bank details</strong></p>
                </div>
                <div class="col-span-5 space-y-1.5 text-right">
                    <div class="flex justify-between"><span>Sub-Total (Machinery):</span><span class="font-semibold">${formatINR(t.subTotal)}</span></div>
                    <div class="flex justify-between"><span>Packing & Forwarding:</span><span class="font-semibold">${formatINR(d.freight)}</span></div>
                    <div class="flex justify-between"><span>GST (${d.gstRate}%):</span><span class="font-semibold">${formatINR(t.gstAmt)}</span></div>
                    <div class="flex justify-between text-sm font-extrabold border-t border-slate-300 pt-2 text-slate-900">
                        <span>Grand Total:</span><span>${formatINR(t.grandTotal)}</span>
                    </div>
                </div>
            </div>

            <div class="flex justify-between items-end pt-10 mt-6">
                <p class="text-[11px] text-slate-400">Customer Acceptance Sign & Stamp</p>
                <div class="text-right">
                    <p class="font-bold text-slate-800">For ARF FOOD MACHINERY</p>
                    <p class="text-[11px] text-slate-400 mt-6">Authorized Signatory</p>
                </div>
            </div>
        </div>
    `;

    const m = document.getElementById('printModal');
    m.classList.remove('hidden');
    m.classList.add('flex');
}

function openLeadModal() {
    document.getElementById('leadForm').reset();
    document.getElementById('leadModal').classList.remove('hidden');
    document.getElementById('leadModal').classList.add('flex');
}
function openMachineModal() {
    document.getElementById('machineForm').reset();
    document.getElementById('machineModal').classList.remove('hidden');
    document.getElementById('machineModal').classList.add('flex');
}
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.getElementById(id).classList.remove('flex');
}

function quickQuoteFromLead(id) {
    const l = leads.find(x => x.id === id);
    openDocModal('Quotation', l);
}

document.getElementById('leadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    leads.unshift({
        id: Date.now(),
        name: document.getElementById('l_name').value,
        company: document.getElementById('l_company').value,
        phone: document.getElementById('l_phone').value,
        machine: document.getElementById('l_machine').value,
        budget: Number(document.getElementById('l_budget').value || 0),
        status: document.getElementById('l_status').value
    });
    saveAll();
    closeModal('leadModal');
    renderLeads();
});

document.getElementById('machineForm').addEventListener('submit', function(e) {
    e.preventDefault();
    machines.unshift({
        id: Date.now(),
        sku: document.getElementById('m_sku').value,
        name: document.getElementById('m_name').value,
        cat: document.getElementById('m_cat').value,
        spec: document.getElementById('m_spec').value,
        hsn: document.getElementById('m_hsn').value || '8438',
        price: Number(document.getElementById('m_price').value || 0),
        stock: Number(document.getElementById('m_stock').value || 0)
    });
    saveAll();
    closeModal('machineModal');
    renderInventory();
});

function deleteLead(id) { leads = leads.filter(x => x.id !== id); saveAll(); renderLeads(); }
function deleteMachine(id) { machines = machines.filter(x => x.id !== id); saveAll(); renderInventory(); }
function deleteDoc(id) { docs = docs.filter(x => x.id !== id); saveAll(); renderDocs(); }

function renderAll() {
    updateKPIs();
    renderLeads();
    renderInventory();
    renderDocs();
}

renderAll();