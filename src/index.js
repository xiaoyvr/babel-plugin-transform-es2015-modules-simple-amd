"use strict";

require("better-log/install");

var _babelTemplate = require("babel-template");

var _babelTemplate2 = _interopRequireDefault(_babelTemplate);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var buildModule = (0, _babelTemplate2.default)("\ndefine([IMPORT_PATHS], function(IMPORT_VARS) {\n\tNAMED_IMPORTS;\n\tBODY;\n});\n");

module.exports = function (_ref) {
	var t = _ref.types;

	return {
		visitor: {
			Program: {
				exit: function exit(path, file) {
					var body = path.get("body"),
					    sources = [],
					    anonymousSources = [],
					    vars = [],
					    namedImports = [],
					    isModular = false,
					    middleDefaultExportID = false,
              middleExportIDs = []


					for (var i = 0; i < body.length; i++) {
						var _path = body[i],
						    isLast = i == body.length - 1;

						if (_path.isExportDefaultDeclaration()) {
							var declaration = _path.get("declaration");
							if (isLast) {
                if(declaration.node.type === "FunctionDeclaration"){
                  _path.replaceWith(t.returnStatement(t.functionExpression(null,declaration.node.params, declaration.node.body)));
                } else {
                  _path.replaceWith(t.returnStatement(declaration.node));
                }
							} else {
                middleDefaultExportID = _path.scope.generateUidIdentifier("export_default");
                if(declaration.node.type === "FunctionDeclaration"){
                  _path.replaceWith(t.variableDeclaration('var', [t.variableDeclarator(middleDefaultExportID, t.functionExpression(null,declaration.node.params, declaration.node.body))]));
                } else {
                  _path.replaceWith(t.variableDeclaration('var', [t.variableDeclarator(middleDefaultExportID, declaration.node)]));
                }
							}
							isModular = true;
						}  else if (_path.isExportDeclaration()){

              var declaration = _path.node.declaration;
              if (!!declaration) {
                _path.replaceWith(declaration);
                if(declaration.type === 'FunctionDeclaration'){
                  middleExportIDs.push(declaration.id);
                } else {
                  declaration.declarations.forEach(d => middleExportIDs.push(d.id));
                }
              } else {
                // export default class A
                var exported = _path.node.specifiers[0].exported;
                var localNode = _path.node.specifiers[0].local;

                if (isLast) {
                  _path.replaceWith(t.returnStatement(localNode));
                }
                else {
                  _path.remove();
                  middleDefaultExportID = localNode;
                }
              }
              isModular = true;
            }

						if (_path.isImportDeclaration()) {
							var specifiers = _path.node.specifiers;

							if (specifiers.length == 0) {
								anonymousSources.push(_path.node.source);
							} else if (specifiers.length == 1 && specifiers[0].type == 'ImportDefaultSpecifier') {
								sources.push(_path.node.source);
								vars.push(specifiers[0]);
							} else {
								(function () {
									var importedID = _path.scope.generateUidIdentifier(_path.node.source.value);
									sources.push(_path.node.source);
									vars.push(importedID);

									specifiers.forEach(function (_ref2) {
										var imported = _ref2.imported;
										var local = _ref2.local;

										namedImports.push(t.variableDeclaration("var", [t.variableDeclarator(t.identifier(local.name), t.identifier(importedID.name + '.' + imported.name))]));
									});
								})();
							}

							_path.remove();

							isModular = true;
						}

            if (isLast) {
              if (middleDefaultExportID && middleExportIDs.length > 0) {
                throw new Error();
              }
              if (middleDefaultExportID ){
                _path.insertAfter(t.returnStatement(middleDefaultExportID));
              } else if (middleExportIDs.length > 0) {
                _path.insertAfter(t.returnStatement(t.objectExpression(middleExportIDs.map(id => t.objectProperty(t.stringLiteral(id.name), id)))))
              }
            }
					}

					if (isModular) {
						path.node.body = [buildModule({
							IMPORT_PATHS: sources.concat(anonymousSources),
							IMPORT_VARS: vars,
							BODY: path.node.body,
							NAMED_IMPORTS: namedImports
						})];
					}
				}
			}
		}
	};
};
