import MakeCommand from '@adonisjs/core/commands/make/command';
import stringHelpers from '@adonisjs/core/helpers/string';
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class MakeValidatorApi extends MakeCommand {

  static commandName = 'make:validator:api'
  static description = 'Make a new HTTP validator for API Only'

  static options: CommandOptions = {}

  protected stubPath: string = join(__dirname, '..', 'templates/validator.txt');
  protected destinationPath: string = 'app/validators';

  async run() {

    // Read the `validatorName` argument
    let validatorName = this.parsed.args[0];

    if (!validatorName) {
      this.logger.error('You must provide a validator name.');
      return;
    }

    validatorName = stringHelpers.pascalCase(validatorName);
    const filename = `${validatorName}`

    // Read the stub file1
    const stubContent = readFileSync(this.stubPath, 'utf8');

    // Replace placeholders with actual values
    const replacedContent = stubContent
      .replace(/{{ validatorName }}/g, validatorName)
      .replace(/{{ filename }}/g, filename)
      // .replace(/{{ controllerVariable }}/g, validatorName.toLowerCase())
      // .replace(/{{ controllerVariables }}/g, `${validatorName.toLowerCase()}s`);

    // Write the new controller file
    const outputPath = join(this.destinationPath, `${filename}.ts`);
    writeFileSync(outputPath, replacedContent);

    this.logger.success(`Validator ${filename} created successfully at ${outputPath}`);
  }
}