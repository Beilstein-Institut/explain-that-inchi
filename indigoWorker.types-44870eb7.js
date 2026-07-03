/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/
var Command;
(function (Command) {
  Command[Command["Info"] = 0] = "Info";
  Command[Command["Convert"] = 1] = "Convert";
  Command[Command["Layout"] = 2] = "Layout";
  Command[Command["Clean"] = 3] = "Clean";
  Command[Command["Aromatize"] = 4] = "Aromatize";
  Command[Command["Dearomatize"] = 5] = "Dearomatize";
  Command[Command["CalculateCip"] = 6] = "CalculateCip";
  Command[Command["Automap"] = 7] = "Automap";
  Command[Command["Check"] = 8] = "Check";
  Command[Command["Calculate"] = 9] = "Calculate";
  Command[Command["GenerateImageAsBase64"] = 10] = "GenerateImageAsBase64";
  Command[Command["GetInChIKey"] = 11] = "GetInChIKey";
  Command[Command["ExplicitHydrogens"] = 12] = "ExplicitHydrogens";
  Command[Command["CalculateMacromoleculeProperties"] = 13] = "CalculateMacromoleculeProperties";
})(Command || (Command = {}));
var WorkerEvent;
(function (WorkerEvent) {
  WorkerEvent["Info"] = "info";
  WorkerEvent["Convert"] = "convert";
  WorkerEvent["Layout"] = "layout";
  WorkerEvent["Clean"] = "clean";
  WorkerEvent["Aromatize"] = "aromatize";
  WorkerEvent["Dearomatize"] = "dearomatize";
  WorkerEvent["CalculateCip"] = "calculateCip";
  WorkerEvent["Automap"] = "automap";
  WorkerEvent["Check"] = "check";
  WorkerEvent["Calculate"] = "calculate";
  WorkerEvent["GenerateImageAsBase64"] = "generateImageAsBase64";
  WorkerEvent["GetInChIKey"] = "getInChIKey";
  WorkerEvent["ExplicitHydrogens"] = "convert_explicit_hydrogens";
  WorkerEvent["CalculateMacromoleculeProperties"] = "calculateMacroProperties";
})(WorkerEvent || (WorkerEvent = {}));
var SupportedFormat;
(function (SupportedFormat) {
  SupportedFormat["Rxn"] = "rxnfile";
  SupportedFormat["Mol"] = "molfile";
  SupportedFormat["Smiles"] = "smiles";
  SupportedFormat["Smarts"] = "smarts";
  SupportedFormat["CML"] = "cml";
  SupportedFormat["InChI"] = "inchi";
  SupportedFormat["InChIAuxInfo"] = "inchi-aux";
  SupportedFormat["InChIKey"] = "inchi-key";
  SupportedFormat["Ket"] = "ket";
  SupportedFormat["CDX"] = "cdx";
  SupportedFormat["CDXML"] = "cdxml";
  SupportedFormat["SDF"] = "sdf";
  SupportedFormat["FASTA"] = "fasta";
  SupportedFormat["SEQUENCE"] = "sequence";
  SupportedFormat["SEQUENCE_3_LETTER"] = "peptide-sequence-3-letter";
  SupportedFormat["IDT"] = "idt";
  SupportedFormat["AXOLABS"] = "axo-labs";
  SupportedFormat["HELM"] = "helm";
  SupportedFormat["RDF"] = "rdf";
  SupportedFormat["MonomerLibrary"] = "monomer-library";
})(SupportedFormat || (SupportedFormat = {}));

export { Command as C, SupportedFormat as S, WorkerEvent as W };
//# sourceMappingURL=indigoWorker.types-44870eb7.js.map
