import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { QuestionValidationService } from './question-validation.service';
import { ComprehensionQuestion } from '../../../shared/src/types';

describe('QuestionValidationService', () => {
  let service: QuestionValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionValidationService],
    }).compile();

    service = module.get<QuestionValidationService>(QuestionValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateQuestions', () => {
    it('should validate valid multiple choice question', () => {
      const questions: ComprehensionQuestion[] = [{
        id: '1',
        question: 'What is 2+2?',
        type: 'multiple_choice',
        options: ['3', '4', '5'],
        correctAnswer: '4',
        difficulty: 'easy',
        points: 10,
      }];

      expect(() => service.validateQuestions(questions)).not.toThrow();
    });

    it('should throw error for empty questions array', () => {
      expect(() => service.validateQuestions([])).toThrow(BadRequestException);
    });

    it('should throw error for missing question text', () => {
      const questions: ComprehensionQuestion[] = [{
        id: '1',
        question: '',
        type: 'multiple_choice',
        options: ['3', '4', '5'],
        correctAnswer: '4',
        difficulty: 'easy',
        points: 10,
      }];

      expect(() => service.validateQuestions(questions)).toThrow(BadRequestException);
    });

    it('should throw error for multiple choice with insufficient options', () => {
      const questions: ComprehensionQuestion[] = [{
        id: '1',
        question: 'Test?',
        type: 'multiple_choice',
        options: ['only one'],
        correctAnswer: 'only one',
        difficulty: 'easy',
        points: 10,
      }];

      expect(() => service.validateQuestions(questions)).toThrow(BadRequestException);
    });

    it('should throw error for true/false with invalid answer', () => {
      const questions: ComprehensionQuestion[] = [{
        id: '1',
        question: 'Test?',
        type: 'true_false',
        correctAnswer: 'maybe',
        difficulty: 'easy',
        points: 10,
      }];

      expect(() => service.validateQuestions(questions)).toThrow(BadRequestException);
    });
  });

  describe('sanitizeQuestions', () => {
    it('should trim whitespace from question text', () => {
      const questions: ComprehensionQuestion[] = [{
        id: '1',
        question: '  What is 2+2?  ',
        type: 'multiple_choice',
        options: ['  3  ', '  4  ', '  5  '],
        correctAnswer: '4',
        difficulty: 'easy',
        points: 10,
      }];

      const sanitized = service.sanitizeQuestions(questions);
      expect(sanitized[0].question).toBe('What is 2+2?');
      expect(sanitized[0].options).toEqual(['3', '4', '5']);
    });
  });
});