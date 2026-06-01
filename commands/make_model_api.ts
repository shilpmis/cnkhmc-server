import MakeCommand from '@adonisjs/core/commands/make/command';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import stringHelpers from '@adonisjs/core/helpers/string';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class MakeModelApi extends MakeCommand {

  static commandName = 'make:model:api'
  static description = 'Make a new HTTP models for API Only'

  // static options: CommandOptions = {}

  protected stubPath: string = join(__dirname, '..', 'templates/model.txt');
  protected destinationPath: string = 'app/models';

  async run() {

    // Read the `modelName` argument
    let modelName = this.parsed.args[0];

    if (!modelName) {
      this.logger.error('You must provide a model name.');
      return;
    }

    modelName = stringHelpers.pascalCase(modelName);
    const filename = `${modelName}`

    // Read the stub file
    const stubContent = readFileSync(this.stubPath, 'utf8');

    // Replace placeholders with actual values
    const replacedContent = stubContent
      .replace(/{{ modelName }}/g, modelName)
      .replace(/{{ filename }}/g, filename)

    // Write the new controller file
    const outputPath = join(this.destinationPath, `${filename}.ts`);
    writeFileSync(outputPath, replacedContent);

    this.logger.success(`Model ${modelName} created successfully at ${outputPath}`);
  }
}