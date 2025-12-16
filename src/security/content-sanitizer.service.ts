import { Injectable } from '@nestjs/common';

@Injectable()
export class ContentSanitizerService {
  private readonly allowedTags = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'strong', 'em', 'u', 'i', 'b',
    'ul', 'ol', 'li', 'blockquote',
    'img', 'a', 'span', 'div'
  ];

  sanitizeHtmlContent(htmlContent: string): string {
    if (!htmlContent) return '';

    // Basic HTML sanitization
    let clean = htmlContent
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+="[^"]*"/gi, '');

    return this.validateImageSources(clean);
  }

  private validateImageSources(html: string): string {
    const trustedDomains = ['localhost', 'aelh.org', 'cdn.aelh.org', 'amazonaws.com', 's3.amazonaws.com', 's3.eu-west-3.amazonaws.com'];

    return html.replace(/<img[^>]+src="([^"]*)"[^>]*>/g, (match, src) => {
      if (src.startsWith('data:image/')) {
        return match;
      }

      try {
        const url = new URL(src);
        if (trustedDomains.some(domain => url.hostname.includes(domain) || url.hostname.endsWith(domain))) {
          return match;
        }
      } catch (e) {
        // Invalid URL
      }

      return '';
    });
  }

  validateQuestionContent(questions: any[]): any[] {
    return questions.map(question => ({
      ...question,
      question: this.sanitizeText(question.question),
      options: question.options?.map(opt => this.sanitizeText(opt)),
      correctAnswer: Array.isArray(question.correctAnswer) 
        ? question.correctAnswer.map(ans => this.sanitizeText(ans))
        : this.sanitizeText(question.correctAnswer),
      explanation: question.explanation ? this.sanitizeText(question.explanation) : undefined,
      hints: question.hints?.map(hint => this.sanitizeText(hint)),
    }));
  }

  private sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  validateContentMetadata(metadata: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata.title || metadata.title.length < 3) {
      errors.push('Title must be at least 3 characters long');
    }
    if (metadata.title && metadata.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }

    if (!metadata.language || metadata.language.length < 2) {
      errors.push('Language is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}