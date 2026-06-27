const RDKIT_VERSION = "2025.3.4-1.0.0";
const RDKIT_BASE = `https://unpkg.com/@rdkit/rdkit@${RDKIT_VERSION}/dist`;

let RDKit = null;
let currentMol = null;
let renderMode = "svg";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showError(msg) {
    const el = $("#input-error");
    if (msg) {
        el.textContent = msg;
        el.classList.remove("hidden");
    } else {
        el.textContent = "";
        el.classList.add("hidden");
    }
}

function freeMol() {
    if (currentMol) {
        currentMol.delete();
        currentMol = null;
    }
}

function parseMol(smiles) {
    freeMol();
    const mol = RDKit.get_mol(smiles);
    if (!mol || !mol.is_valid()) {
        if (mol) mol.delete();
        return null;
    }
    currentMol = mol;
    return mol;
}

function structureDetails() {
    const details = {};
    if ($("#opt-atom-indices").checked) details.addAtomIndices = true;
    if ($("#opt-explicit-methyl").checked) details.explicitMethyl = true;
    const legend = $("#opt-legend").value.trim();
    if (legend) details.legend = legend;
    return Object.keys(details).length ? JSON.stringify(details) : "";
}

function renderStructure() {
    if (!currentMol) return;

    const svgEl = $("#svg-output");
    const canvasEl = $("#canvas-output");
    const details = structureDetails();

    if (renderMode === "svg") {
        svgEl.classList.remove("hidden");
        canvasEl.classList.add("hidden");
        const svg = details
            ? currentMol.get_svg_with_highlights(details)
            : currentMol.get_svg();
        svgEl.innerHTML = svg;
    } else {
        svgEl.classList.add("hidden");
        canvasEl.classList.remove("hidden");
        const ctx = canvasEl.getContext("2d");
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        if (details) {
            currentMol.draw_to_canvas_with_highlights(canvasEl, details);
        } else {
            currentMol.draw_to_canvas(canvasEl, -1, -1);
        }
    }
}

function renderDescriptors() {
    const out = $("#descriptors-output");
    out.innerHTML = "";
    if (!currentMol) return;

    const descriptors = JSON.parse(currentMol.get_descriptors());
    Object.keys(descriptors)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
        .forEach((name) => {
            const item = document.createElement("div");
            item.className = "descriptor-item";
            item.innerHTML =
                `<div class="descriptor-name">${name}</div>` +
                `<div class="descriptor-value">${descriptors[name]}</div>`;
            out.appendChild(item);
        });
}

function renderIdentifiers() {
    const out = $("#identifiers-output");
    out.innerHTML = "";
    if (!currentMol) return;

    const ids = [
        "smiles",
        "cxsmiles",
        "inchi",
        "inchikey",
        "morgan_fp",
        "pattern_fp",
        "aromatic_form",
        "kekule_form",
        "molblock",
        "v3Kmolblock",
    ];

    ids.forEach((id) => {
        let val;
        if (id === "inchikey") {
            val = RDKit.get_inchikey_for_inchi(currentMol.get_inchi());
        } else {
            val = currentMol[`get_${id}`]();
        }

        const dt = document.createElement("dt");
        dt.textContent = id;
        const dd = document.createElement("dd");
        dd.textContent = val;
        out.appendChild(dt);
        out.appendChild(dd);
    });
}

function renderSubstructure() {
    const status = $("#substruct-status");
    const canvas = $("#substruct-canvas");
    status.textContent = "";
    if (!currentMol) return;

    const smarts = $("#smarts-input").value.trim();
    if (!smarts) {
        status.textContent = "Enter a SMARTS pattern.";
        return;
    }

    const qmol = RDKit.get_qmol(smarts);
    if (!qmol || !qmol.is_valid()) {
        if (qmol) qmol.delete();
        status.textContent = "Invalid SMARTS pattern.";
        return;
    }

    const match = currentMol.get_substruct_match(qmol);
    qmol.delete();

    if (!match) {
        status.textContent = "No substructure match found.";
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        currentMol.draw_to_canvas(canvas, -1, -1);
        return;
    }

    status.textContent = "Match found — highlighted below.";
    currentMol.draw_to_canvas_with_highlights(canvas, match);
}

function runAll() {
    showError("");
    const smiles = $("#smiles-input").value.trim();
    if (!smiles) {
        showError("Enter a SMILES string.");
        return;
    }

    const mol = parseMol(smiles);
    if (!mol) {
        showError("Invalid SMILES — RDKit could not parse this structure.");
        return;
    }

    renderStructure();
    renderDescriptors();
    renderIdentifiers();
    renderSubstructure();
}

function switchTab(name) {
    $$(".tab").forEach((tab) => {
        const active = tab.dataset.tab === name;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", active);
    });
    $$(".panel").forEach((panel) => {
        const active = panel.id === `panel-${name}`;
        panel.classList.toggle("active", active);
        panel.hidden = !active;
    });
}

function initUI() {
    $("#run-btn").addEventListener("click", runAll);
    $("#smiles-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runAll();
    });

    $("#example-select").addEventListener("change", (e) => {
        if (e.target.value) {
            $("#smiles-input").value = e.target.value;
            e.target.value = "";
            runAll();
        }
    });

    $$(".tab").forEach((tab) => {
        tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });

    $$("[data-render]").forEach((btn) => {
        btn.addEventListener("click", () => {
            renderMode = btn.dataset.render;
            $$("[data-render]").forEach((b) => b.classList.toggle("active", b === btn));
            renderStructure();
        });
    });

    ["opt-atom-indices", "opt-explicit-methyl", "opt-legend"].forEach((id) => {
        $("#" + id).addEventListener("input", renderStructure);
        $("#" + id).addEventListener("change", renderStructure);
    });

    $("#highlight-btn").addEventListener("click", renderSubstructure);
    $("#smarts-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") renderSubstructure();
    });
}

window.initRDKitModule({
    locateFile: () => `${RDKIT_BASE}/RDKit_minimal.wasm`,
})
    .then((instance) => {
        RDKit = instance;
        $("#loader").classList.add("hidden");
        $("#app").classList.remove("hidden");
        $("#rdkit-version").textContent = `RDKit ${RDKit.version()}`;
        initUI();
        runAll();
    })
    .catch((err) => {
        $("#loader").innerHTML =
            `<div class="loader-card"><p class="loader-title">Failed to load RDKit</p>` +
            `<p class="loader-sub">${err.message || "Check your network connection."}</p></div>`;
    });
