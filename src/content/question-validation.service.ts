import { Injectable, BadRequestException } from '@nestjs/common';

interface ComprehensionQuestion {
  id?: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'matching' | 'ordering';
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  timeLimit?: number;
  hints?: string[];
}

@Injectable()
export class QuestionValidationService {
  validateQuestions(questions: ComprehensionQuestion[]): void {
    if (!questions || questions.length === 0) {
      return; // Questions are optional
    }

    questions.forEach((question, index) => {
      this.validateSingleQuestion(question, index);
    });
  }

  private validateSingleQuestion(question: ComprehensionQuestion, index: number): void {
    const prefix = `Question ${index + 1}:`;

    if (!question.question?.trim()) {
      throw new BadRequestException(`${prefix} Question text is required`);
    }

    if (!question.type) {
      throw new BadRequestException(`${prefix} Question type is required`);
    }

    if (!question.difficulty) {
      throw new BadRequestException(`${prefix} Difficulty level is required`);
    }

    if (!question.points || question.points < 1) {
      throw new BadRequestException(`${prefix} Points must be at least 1`);
    }

    this.validateQuestionType(question, prefix);
  }

  private validateQuestionType(question: ComprehensionQuestion, prefix: string): void {
    switch (question.type) {
      case 'multiple_choice':
        if (!question.options || question.options.length < 2) {
          throw new BadRequestException(`${prefix} Multiple choice questions need at least 2 options`);
        }
        if (!question.correctAnswer) {
          throw new BadRequestException(`${prefix} Correct answer is required`);
        }
        if (!question.options.includes(question.correctAnswer as string)) {
          throw new BadRequestException(`${prefix} Correct answer must be one of the options`);
        }
        break;

      case 'true_false':
        if (!question.correctAnswer || !['true', 'false'].includes(question.correctAnswer as string)) {
          throw new BadRequestException(`${prefix} True/false questions must have 'true' or 'false' as correct answer`);
        }
        break;

      case 'fill_blank':
      case 'short_answer':
        if (!question.correctAnswer || !(question.correctAnswer as string).trim()) {
          throw new BadRequestException(`${prefix} Correct answer is required`);
        }
        break;

      case 'matching':
        if (!Array.isArray(question.correctAnswer) || question.correctAnswer.length < 2) {
          throw new BadRequestException(`${prefix} Matching questions need at least 2 pairs`);
        }
        break;

      case 'ordering':
        if (!Array.isArray(question.correctAnswer) || question.correctAnswer.length < 2) {
          throw new BadRequestException(`${prefix} Ordering questions need at least 2 items`);
        }
        break;

      default:
        throw new BadRequestException(`${prefix} Unsupported question type: ${question.type}`);
    }

    if (question.timeLimit && question.timeLimit < 10) {
      throw new BadRequestException(`${prefix} Time limit must be at least 10 seconds`);
    }
  }

  sanitizeQuestions(questions: ComprehensionQuestion[]): ComprehensionQuestion[] {
    return questions.map(question => ({
      ...question,
      question: question.question.trim(),
      explanation: question.explanation?.trim() || '',
      hints: question.hints?.map(hint => hint.trim()).filter(Boolean) || [],
      options: question.options?.map(option => option.trim()).filter(Boolean) || [],
    }));
  }
}