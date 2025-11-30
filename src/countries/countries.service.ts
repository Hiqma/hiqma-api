import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from '../database/entities';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Country)
    private countryRepository: Repository<Country>,
  ) {}

  async getAllCountries() {
    return this.countryRepository.find({
      order: { name: 'ASC' },
    });
  }

  async seedCountries() {
    const countries = [
      { code: 'KE', name: 'Kenya', continent: 'Africa' },
      { code: 'GH', name: 'Ghana', continent: 'Africa' },
      { code: 'NG', name: 'Nigeria', continent: 'Africa' },
      { code: 'TZ', name: 'Tanzania', continent: 'Africa' },
      { code: 'UG', name: 'Uganda', continent: 'Africa' },
      { code: 'RW', name: 'Rwanda', continent: 'Africa' },
      { code: 'ET', name: 'Ethiopia', continent: 'Africa' },
      { code: 'ZA', name: 'South Africa', continent: 'Africa' },
    ];

    for (const country of countries) {
      const exists = await this.countryRepository.findOne({ where: { code: country.code } });
      if (!exists) {
        await this.countryRepository.save(country);
      }
    }
    
    return this.getAllCountries();
  }
}