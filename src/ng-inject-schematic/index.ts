import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
} from '@angular-devkit/schematics';
import { Project } from 'ts-morph';
import { IOptions } from "../index.interface";

const getContent = (tree: Tree, path: string): string => {
  const file = tree.read(path);
  if (!file) {
    throw new SchematicsException(`File does not exist.`);
  }
  return file.toString('utf-8');
}

export function ngInjectSchematic(_options: IOptions): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const project  = new Project({});
    const { path } = _options;
    if (!path) {
      throw new SchematicsException(`You should specify path to file`);
    }

    let content = getContent(tree, path);

    const fileWithoutNgInject = content
      .replace('// @ngInject', '')
      .replace('//@ngInject', '');

    let sourceFile = project.createSourceFile('temporary.ts', fileWithoutNgInject);
    const classDeclaration = sourceFile.getClasses()[0];
    const constructorDeclaration = classDeclaration.getConstructors()[0];
    const injectionNames = constructorDeclaration
      .getParameters()
      .map((param) => param.getName());
    classDeclaration.insertProperty(0, {
      name: '$inject',
      isStatic: true,
      isReadonly: true,
    });
    classDeclaration
      .getProperty('$inject')
      ?.setInitializer(`['${injectionNames.join('\', \'')}']`);
    tree.overwrite(path, sourceFile.getFullText())
    return tree;
  };
}
