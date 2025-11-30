import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { QuestionValidationService } from './question-validation.service';

describe('ContentController', () => {
  let controller: ContentController;
  let service: ContentService;

  const mockContentService = {
    getAllContent: jest.fn(),
    getContentByCountry: jest.fn(),
    submitContent: jest.fn(),
    updateContentStatus: jest.fn(),
  };

  const mockQuestionValidationService = {
    validateQuestions: jest.fn(),
    sanitizeQuestions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        { provide: ContentService, useValue: mockContentService },
        { provide: QuestionValidationService, useValue: mockQuestionValidationService },
      ],
    }).compile();

    controller = module.get<ContentController>(ContentController);
    service = module.get<ContentService>(ContentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get all content', async () => {
    const mockContent = [{ id: '1', title: 'Test Content' }];
    mockContentService.getAllContent.mockResolvedValue(mockContent);

    const result = await controller.getAllContent();
    expect(result).toEqual(mockContent);
    expect(service.getAllContent).toHaveBeenCalled();
  });

  it('should get content by country', async () => {
    const mockContent = [{ id: '1', title: 'Kenya Content' }];
    mockContentService.getContentByCountry.mockResolvedValue(mockContent);

    const result = await controller.getAllContent('KE');
    expect(result).toEqual(mockContent);
    expect(service.getContentByCountry).toHaveBeenCalledWith('KE');
  });
});