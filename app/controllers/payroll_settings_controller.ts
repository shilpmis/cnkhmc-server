import type { HttpContext } from '@adonisjs/core/http'
import PayrollSetting from '#models/payroll_setting'

export default class PayrollSettingsController {
  async getSettings({ auth, response }: HttpContext) {
    const schoolId = auth.user!.school_id as number
    let settings = await PayrollSetting.query().where('school_id', schoolId).first()
    
    if (!settings) {
      settings = await PayrollSetting.create({
        schoolId: schoolId,
        lopCalculationBase: 'Gross Salary',
        lopDaysDenominator: 'Actual Days in Month',
        epfEmployeePercentage: 12.0,
        epfEmployerPercentage: 12.0,
        esiEmployeePercentage: 0.75,
        esiEmployerPercentage: 3.25,
        taxSlabs: [
          { min: 0, max: 5999, tax: 0 },
          { min: 6000, max: 8999, tax: 150 },
          { min: 9000, max: 11999, tax: 200 },
          { min: 12000, max: 9999999, tax: 200 }
        ]
      })
    }
    
    return response.ok(settings)
  }

  async updateSettings({ auth, request, response }: HttpContext) {
    const schoolId = auth.user!.school_id as number
    const data = request.only([
      'lopCalculationBase', 
      'lopDaysDenominator', 
      'epfEmployeePercentage', 
      'epfEmployerPercentage', 
      'esiEmployeePercentage', 
      'esiEmployerPercentage', 
      'taxSlabs'
    ])
    
    let settings = await PayrollSetting.query().where('school_id', schoolId).first()
    
    if (!settings) {
      settings = new PayrollSetting()
      settings.schoolId = schoolId
    }
    
    settings.merge(data)
    await settings.save()
    
    return response.ok(settings)
  }
}