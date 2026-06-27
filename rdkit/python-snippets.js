const pythonSnippets = {
    parse(smiles) {
        const s = JSON.stringify(smiles);
        return `from rdkit import Chem

smiles = ${s}
mol = Chem.MolFromSmiles(smiles)
if mol is None:
    raise ValueError("Invalid SMILES")`;
    },

    draw(smiles, options = {}) {
        const s = JSON.stringify(smiles);
        const lines = [
            "from rdkit import Chem",
            "from rdkit.Chem import rdMolDraw2D",
            "",
            `smiles = ${s}`,
            "mol = Chem.MolFromSmiles(smiles)",
            "",
            "drawer = rdMolDraw2D.MolDraw2DSVG(420, 320)",
            "opts = drawer.drawOptions()",
        ];
        if (options.addAtomIndices) lines.push("opts.addAtomIndices = True");
        if (options.explicitMethyl) lines.push("opts.explicitMethyl = True");
        if (options.legend) {
            lines.push("");
            lines.push(`drawer.DrawMolecule(mol, legend=${JSON.stringify(options.legend)})`);
        } else {
            lines.push("");
            lines.push("drawer.DrawMolecule(mol)");
        }
        lines.push("drawer.FinishDrawing()");
        lines.push("svg = drawer.GetDrawingText()");
        lines.push("");
        lines.push("# PNG instead of SVG:");
        lines.push("# from rdkit.Chem import Draw");
        lines.push("# Draw.MolToImage(mol, size=(420, 320))");
        return lines.join("\n");
    },

    descriptors(smiles) {
        const s = JSON.stringify(smiles);
        return `from rdkit import Chem
from rdkit.Chem import Descriptors, Lipinski, rdMolDescriptors

smiles = ${s}
mol = Chem.MolFromSmiles(smiles)

# Common descriptors (RDKit.js bundles many more into get_descriptors())
Descriptors.MolWt(mol)
Descriptors.MolLogP(mol)
Descriptors.TPSA(mol)
Lipinski.NumHDonors(mol)
Lipinski.NumHAcceptors(mol)
Lipinski.NumRotatableBonds(mol)
rdMolDescriptors.CalcNumRings(mol)
rdMolDescriptors.CalcNumAromaticRings(mol)
rdMolDescriptors.CalcNumAliphaticRings(mol)
rdMolDescriptors.CalcFractionCSP3(mol)`;
    },

    identifiers(smiles) {
        const s = JSON.stringify(smiles);
        return `from rdkit import Chem
from rdkit.Chem import AllChem, inchi

smiles = ${s}
mol = Chem.MolFromSmiles(smiles)

Chem.MolToSmiles(mol)                    # canonical SMILES
Chem.MolToCXSmiles(mol)                  # CXSMILES
Chem.MolToInchi(mol)                     # InChI
inchi.InchiToInchiKey(Chem.MolToInchi(mol))
AllChem.GetMorganFingerprintAsBitVect(mol, 2, nBits=2048)
Chem.RDKFingerprint(mol)                 # pattern fingerprint
Chem.MolToSmiles(mol, isomericSmiles=False)  # aromatic / kekule forms vary
Chem.MolToMolBlock(mol)                  # V2000 molblock
Chem.MolToMolBlock(mol, kekulize=False)  # V3000 via MolToV3KMolBlock:
Chem.MolToV3KMolBlock(mol)`;
    },

    substructure(smiles, smarts) {
        return `from rdkit import Chem
from rdkit.Chem import Draw

mol = Chem.MolFromSmiles(${JSON.stringify(smiles)})
pattern = Chem.MolFromSmarts(${JSON.stringify(smarts)})

match = mol.GetSubstructMatch(pattern)
if match:
    # match is a tuple of atom indices
    Draw.MolToImage(mol, highlightAtoms=list(match))
else:
    print("No substructure match")`;
    },
};
