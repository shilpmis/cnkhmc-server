import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import MakeController from '@adonisjs/core/commands/make/controller';
import stringHelpers from '@adonisjs/core/helpers/string';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class MakeControllerApi extends MakeController {

  public static commandName = 'make:controller:api';
  public static description = 'Make a new HTTP controller for API only';

  protected stubPath: string = join(__dirname, '..' , 'templates/controller.txt');
  protected destinationPath: string = 'app/Controllers';    

  public async run(): Promise<void> {

    const controllerName = this.parsed.args[0];
    if (!controllerName) {
      this.logger.error('You must provide a controller name.');
      return;
    }

    const modelVariable = stringHelpers.pascalCase(controllerName);
    const filename = `${modelVariable}Controller`;
    

    // Read the stub file
    const stubContent = readFileSync(this.stubPath, 'utf8');

    // Replace placeholders with actual values
    const replacedContent = stubContent
      .replace(/{{ controllerName }}/g, controllerName)
      .replace(/{{ filename }}/g, filename)
      .replace(/{{ controllerVariable }}/g, controllerName.toLowerCase())
      .replace(/{{ controllerVariables }}/g, `${controllerName.toLowerCase()}s`);

    // Write the new controller file
    const outputPath = join(this.destinationPath, `${filename}.ts`);
    writeFileSync(outputPath, replacedContent);

    this.logger.success(`Controller ${filename} created successfully at ${outputPath}`);
  }
}
