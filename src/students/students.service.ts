import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, EdgeHub } from '../database/entities';
import { SecurityService } from '../security/security.service';
import { AuditLoggerService } from '../security/audit-logger.service';
import { AccessControlService, AccessContext } from '../security/access-control.service';
import * as crypto from 'crypto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(EdgeHub)
    private edgeHubRepository: Repository<EdgeHub>,
    private securityService: SecurityService,
    private auditLogger: AuditLoggerService,
    private accessControl: AccessControlService,
  ) {}

  /**
   * Decrypt student data for API responses
   */
  private decryptStudentData(student: Student): Student {
    if (!student) return student;
    
    try {
      student.firstName = student.firstNameEncrypted ? this.securityService.decrypt(student.firstNameEncrypted) : undefined;
      student.lastName = student.lastNameEncrypted ? this.securityService.decrypt(student.lastNameEncrypted) : undefined;
      student.metadata = student.metadataEncrypted ? this.securityService.decrypt(student.metadataEncrypted) : undefined;
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to decrypt student data:', error.message);
    }
    
    return student;
  }

  /**
   * Decrypt multiple students data
   */
  private decryptStudentsData(students: Student[]): Student[] {
    return students.map(student => this.decryptStudentData(student));
  }

  /**
   * Generate a user-friendly student code
   * 4-6 characters, easy for children to remember and type
   * Uses simple patterns and avoids confusing characters
   */
  private generateStudentCode(length: number = 4): string {
    // Use a more limited character set for children - easier to read and type
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    
    // Validate length
    if (length < 3 || length > 6) {
      throw new Error('Student code length must be between 3 and 6 characters');
    }
    
    let result = '';
    
    // Use cryptographically secure random generation
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      result += chars[randomIndex];
    }
    
    // Ensure the code starts with a letter for better readability
    if (/^[0-9]/.test(result)) {
      const letterChars = 'ABCDEFGHJKMNPQRSTUVWXYZ';
      const randomLetterIndex = crypto.randomInt(0, letterChars.length);
      result = letterChars[randomLetterIndex] + result.slice(1);
    }
    
    return result;
  }

  /**
   * Generate a unique student code with collision detection
   */
  private async generateUniqueStudentCode(hubId?: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 15;
    let codeLength = 4; // Start with 4 characters for children
    
    while (attempts < maxAttempts) {
      const code = this.generateStudentCode(codeLength);
      
      // Check for collision in the entire database
      const existing = await this.studentRepository.findOne({ where: { studentCode: code } });
      
      if (!existing) {
        return code;
      }
      
      attempts++;
      
      // After 5 attempts, increase code length
      if (attempts === 5) {
        codeLength = 5;
      } else if (attempts === 10) {
        codeLength = 6;
      }
      
      // Add small delay to prevent rapid database queries
      if (attempts > 3) {
        await new Promise(resolve => setTimeout(resolve, 10 * attempts));
      }
    }
    
    throw new Error(`Unable to generate unique student code after ${maxAttempts} attempts`);
  }

  /**
   * Validate student code format
   */
  private validateStudentCodeFormat(code: string): boolean {
    // Must be 3-6 characters, uppercase letters and numbers, no ambiguous characters
    const validPattern = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{3,6}$/;
    return validPattern.test(code);
  }

  /**
   * Create a student profile
   */
  async createStudent(
    hubId: string, 
    studentData: {
      firstName?: string;
      lastName?: string;
      grade?: string;
      age?: number;
      metadata?: Record<string, any>;
    },
    context: AccessContext = { userType: 'system' }
  ): Promise<Student> {
    try {
      // Check access control
      const contextWithHub = { ...context, hubId };
      await this.accessControl.enforceAccess(contextWithHub, 'student', 'create');

      // Validate hub exists
      const hub = await this.edgeHubRepository.findOne({ where: { hubId } });
      if (!hub) {
        await this.auditLogger.logStudentDataAccess({
          ...contextWithHub,
          action: 'create',
          studentId: 'unknown',
          hubId,
          success: false,
          errorMessage: 'Hub not found',
        });
        throw new NotFoundException('Hub not found');
      }

      // Validate age and COPPA compliance
      if (studentData.age !== undefined && (studentData.age < 3 || studentData.age > 18)) {
        await this.auditLogger.logStudentDataAccess({
          ...contextWithHub,
          action: 'create',
          studentId: 'unknown',
          hubId,
          success: false,
          errorMessage: 'Invalid age provided',
        });
        throw new BadRequestException('Student age must be between 3 and 18');
      }

      // Check COPPA compliance
      const coppaValidation = this.accessControl.validateStudentAge(studentData.age);
      if (!coppaValidation.compliant) {
        await this.auditLogger.logStudentDataAccess({
          ...contextWithHub,
          action: 'create',
          studentId: 'unknown',
          hubId,
          success: false,
          errorMessage: `COPPA compliance issue: ${coppaValidation.warnings.join(', ')}`,
        });
        throw new BadRequestException(`COPPA compliance issue: ${coppaValidation.warnings.join(', ')}`);
      }

      // Check student count limit per hub
      const existingStudentCount = await this.studentRepository.count({ where: { hubId } });
      if (existingStudentCount >= 1000) {
        await this.auditLogger.logStudentDataAccess({
          ...contextWithHub,
          action: 'create',
          studentId: 'unknown',
          hubId,
          success: false,
          errorMessage: 'Maximum student count exceeded',
        });
        throw new BadRequestException('Maximum student count per hub (1000) exceeded');
      }

      const studentCode = await this.generateUniqueStudentCode(hubId);
      
      const student = this.studentRepository.create({
        hubId,
        studentCode,
        firstNameEncrypted: studentData.firstName ? this.securityService.encrypt(studentData.firstName.trim()) : null,
        lastNameEncrypted: studentData.lastName ? this.securityService.encrypt(studentData.lastName.trim()) : null,
        grade: studentData.grade?.trim() || null,
        age: studentData.age || null,
        metadataEncrypted: studentData.metadata ? this.securityService.encrypt(JSON.stringify(studentData.metadata)) : null,
        status: 'active',
      });
      
      const savedStudent = await this.studentRepository.save(student);
      
      // Log successful creation
      await this.auditLogger.logStudentDataAccess({
        ...contextWithHub,
        action: 'create',
        studentId: savedStudent.id,
        hubId,
        success: true,
        details: {
          studentCode: savedStudent.studentCode,
          hasFirstName: !!studentData.firstName,
          hasLastName: !!studentData.lastName,
          grade: studentData.grade,
          age: studentData.age,
          coppaCompliant: coppaValidation.compliant,
          requiresParentalConsent: coppaValidation.requiresParentalConsent,
        },
      });
      
      return this.decryptStudentData(savedStudent);
    } catch (error) {
      // Log failed creation attempt
      await this.auditLogger.logStudentDataAccess({
        ...context,
        action: 'create',
        studentId: 'unknown',
        hubId,
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all students for a hub
   */
  async getStudentsForHub(hubId: string, context: AccessContext = { userType: 'system' }): Promise<Student[]> {
    try {
      // Check access control
      const contextWithHub = { ...context, hubId };
      await this.accessControl.enforceAccess(contextWithHub, 'student', 'view');

      const students = await this.studentRepository.find({
        where: { hubId },
        order: { createdAt: 'DESC' },
      });

      // Log successful access
      await this.auditLogger.logStudentDataAccess({
        ...contextWithHub,
        action: 'view',
        studentId: 'multiple',
        hubId,
        success: true,
        details: {
          studentsRetrieved: students.length,
        },
      });

      return this.decryptStudentsData(students);
    } catch (error) {
      // Log failed access attempt
      await this.auditLogger.logStudentDataAccess({
        ...context,
        action: 'view',
        studentId: 'multiple',
        hubId,
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * Get a single student by ID
   */
  async getStudent(studentId: string): Promise<Student> {
    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return this.decryptStudentData(student);
  }

  /**
   * Update student information
   */
  async updateStudent(
    studentId: string, 
    updateData: {
      firstName?: string;
      lastName?: string;
      grade?: string;
      age?: number;
      metadata?: Record<string, any>;
      status?: 'active' | 'inactive';
    },
    context: AccessContext = { userType: 'system' }
  ): Promise<Student> {
    try {
      // Get student first to check hub access
      const student = await this.studentRepository.findOne({ where: { id: studentId } });
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Check access control
      const contextWithHub = { ...context, hubId: student.hubId };
      await this.accessControl.enforceAccess(contextWithHub, 'student', 'update', studentId);

      // Validate age and COPPA compliance if provided
      if (updateData.age !== undefined && (updateData.age < 3 || updateData.age > 18)) {
        await this.auditLogger.logStudentDataAccess({
          ...contextWithHub,
          action: 'update',
          studentId,
          hubId: student.hubId,
          success: false,
          errorMessage: 'Invalid age provided',
        });
        throw new BadRequestException('Student age must be between 3 and 18');
      }

      // Check COPPA compliance for age updates
      if (updateData.age !== undefined) {
        const coppaValidation = this.accessControl.validateStudentAge(updateData.age);
        if (!coppaValidation.compliant) {
          await this.auditLogger.logStudentDataAccess({
            ...contextWithHub,
            action: 'update',
            studentId,
            hubId: student.hubId,
            success: false,
            errorMessage: `COPPA compliance issue: ${coppaValidation.warnings.join(', ')}`,
          });
          throw new BadRequestException(`COPPA compliance issue: ${coppaValidation.warnings.join(', ')}`);
        }
      }

      // Track what fields are being updated
      const updatedFields: string[] = [];

      // Update fields with encryption
      if (updateData.firstName !== undefined) {
        student.firstNameEncrypted = updateData.firstName ? this.securityService.encrypt(updateData.firstName.trim()) : null;
        updatedFields.push('firstName');
      }
      if (updateData.lastName !== undefined) {
        student.lastNameEncrypted = updateData.lastName ? this.securityService.encrypt(updateData.lastName.trim()) : null;
        updatedFields.push('lastName');
      }
      if (updateData.grade !== undefined) {
        student.grade = updateData.grade?.trim() || null;
        updatedFields.push('grade');
      }
      if (updateData.age !== undefined) {
        student.age = updateData.age;
        updatedFields.push('age');
      }
      if (updateData.metadata !== undefined) {
        student.metadataEncrypted = updateData.metadata ? this.securityService.encrypt(JSON.stringify(updateData.metadata)) : null;
        updatedFields.push('metadata');
      }
      if (updateData.status !== undefined) {
        student.status = updateData.status;
        updatedFields.push('status');
      }
      
      const savedStudent = await this.studentRepository.save(student);

      // Log successful update
      await this.auditLogger.logStudentDataAccess({
        ...contextWithHub,
        action: 'update',
        studentId,
        hubId: student.hubId,
        success: true,
        details: {
          updatedFields,
          newAge: updateData.age,
          newStatus: updateData.status,
        },
      });
      
      return this.decryptStudentData(savedStudent);
    } catch (error) {
      // Log failed update attempt
      await this.auditLogger.logStudentDataAccess({
        ...context,
        action: 'update',
        studentId,
        hubId: 'unknown',
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * Deactivate student account
   */
  async deactivateStudent(studentId: string): Promise<Student> {
    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    student.status = 'inactive';
    const savedStudent = await this.studentRepository.save(student);
    return this.decryptStudentData(savedStudent);
  }

  /**
   * Validate student code format and existence
   */
  async validateStudentCode(studentCode: string): Promise<Student | null> {
    // First validate the format
    if (!this.validateStudentCodeFormat(studentCode)) {
      return null;
    }
    
    // Then check if it exists and is active
    return await this.studentRepository.findOne({ 
      where: { 
        studentCode,
        status: 'active'
      } 
    });
  }

  /**
   * Get student by student code (for authentication)
   */
  async getStudentByCode(studentCode: string): Promise<Student | null> {
    const student = await this.studentRepository.findOne({
      where: { 
        studentCode,
        status: 'active'
      }
    });
    return student ? this.decryptStudentData(student) : null;
  }

  /**
   * Get student statistics for monitoring
   */
  async getStudentStats(): Promise<{
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    averageAge: number;
    gradeDistribution: Record<string, number>;
  }> {
    const totalStudents = await this.studentRepository.count();
    const activeStudents = await this.studentRepository.count({ where: { status: 'active' } });
    const inactiveStudents = await this.studentRepository.count({ where: { status: 'inactive' } });
    
    // Calculate average age
    const ageResult = await this.studentRepository
      .createQueryBuilder('student')
      .select('AVG(student.age)', 'avgAge')
      .where('student.age IS NOT NULL')
      .getRawOne();
    
    const averageAge = ageResult?.avgAge ? Math.round(parseFloat(ageResult.avgAge) * 10) / 10 : 0;
    
    // Get grade distribution
    const gradeResults = await this.studentRepository
      .createQueryBuilder('student')
      .select('student.grade', 'grade')
      .addSelect('COUNT(*)', 'count')
      .where('student.grade IS NOT NULL')
      .groupBy('student.grade')
      .getRawMany();
    
    const gradeDistribution: Record<string, number> = {};
    gradeResults.forEach(result => {
      gradeDistribution[result.grade] = parseInt(result.count);
    });
    
    return {
      totalStudents,
      activeStudents,
      inactiveStudents,
      averageAge,
      gradeDistribution,
    };
  }

  /**
   * Bulk create students from CSV data
   */
  async bulkCreateStudents(hubId: string, studentsData: Array<{
    firstName?: string;
    lastName?: string;
    grade?: string;
    age?: number;
    metadata?: Record<string, any>;
  }>): Promise<Student[]> {
    // Validate hub exists
    const hub = await this.edgeHubRepository.findOne({ where: { hubId } });
    if (!hub) {
      throw new NotFoundException('Hub not found');
    }

    // Validate bulk size
    if (studentsData.length > 100) {
      throw new BadRequestException('Cannot create more than 100 students at once');
    }

    // Check total student count limit
    const existingStudentCount = await this.studentRepository.count({ where: { hubId } });
    if (existingStudentCount + studentsData.length > 1000) {
      throw new BadRequestException('Total student count per hub cannot exceed 1000');
    }

    const students: Student[] = [];
    
    for (const studentData of studentsData) {
      // Validate age if provided
      if (studentData.age !== undefined && (studentData.age < 3 || studentData.age > 18)) {
        throw new BadRequestException(`Invalid age: ${studentData.age}. Age must be between 3 and 18`);
      }

      const studentCode = await this.generateUniqueStudentCode(hubId);
      
      const student = this.studentRepository.create({
        hubId,
        studentCode,
        firstNameEncrypted: studentData.firstName ? this.securityService.encrypt(studentData.firstName.trim()) : null,
        lastNameEncrypted: studentData.lastName ? this.securityService.encrypt(studentData.lastName.trim()) : null,
        grade: studentData.grade?.trim() || null,
        age: studentData.age || null,
        metadataEncrypted: studentData.metadata ? this.securityService.encrypt(JSON.stringify(studentData.metadata)) : null,
        status: 'active',
      });
      
      students.push(student);
    }
    
    const savedStudents = await this.studentRepository.save(students);
    return this.decryptStudentsData(savedStudents);
  }

  /**
   * Export student data for GDPR compliance
   */
  async exportStudentData(
    studentId: string,
    context: AccessContext
  ): Promise<{
    student: any;
    exportedAt: Date;
    complianceNote: string;
  }> {
    try {
      // Get student first to check hub access
      const student = await this.studentRepository.findOne({ where: { id: studentId } });
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Check access control
      const contextWithHub = { ...context, hubId: student.hubId };
      await this.accessControl.enforceAccess(contextWithHub, 'student', 'export', studentId);

      // Decrypt and prepare export data
      const decryptedStudent = this.decryptStudentData(student);
      const exportData = {
        id: decryptedStudent.id,
        studentCode: decryptedStudent.studentCode,
        firstName: decryptedStudent.firstName,
        lastName: decryptedStudent.lastName,
        grade: decryptedStudent.grade,
        age: decryptedStudent.age,
        metadata: decryptedStudent.metadata ? JSON.parse(decryptedStudent.metadata) : null,
        status: decryptedStudent.status,
        createdAt: decryptedStudent.createdAt,
        updatedAt: decryptedStudent.updatedAt,
        hubId: decryptedStudent.hubId,
      };

      // Log data export
      await this.auditLogger.logDataExport({
        ...contextWithHub,
        exportType: 'student_data',
        resourceIds: [studentId],
        hubId: student.hubId,
        success: true,
      });

      return {
        student: exportData,
        exportedAt: new Date(),
        complianceNote: 'Data exported in compliance with GDPR Article 20 (Right to data portability)',
      };
    } catch (error) {
      // Log failed export attempt
      await this.auditLogger.logDataExport({
        ...context,
        exportType: 'student_data',
        resourceIds: [studentId],
        hubId: 'unknown',
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete student data for GDPR compliance (Right to be forgotten)
   */
  async deleteStudentData(
    studentId: string,
    reason: string,
    context: AccessContext
  ): Promise<{ deleted: boolean; message: string }> {
    try {
      // Get student first to check hub access
      const student = await this.studentRepository.findOne({ where: { id: studentId } });
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Check access control
      const contextWithHub = { ...context, hubId: student.hubId };
      await this.accessControl.enforceAccess(contextWithHub, 'student', 'delete', studentId);

      // Check data retention policy
      const retentionCheck = this.accessControl.shouldRetainData(
        'student',
        student.updatedAt,
        student.age
      );

      if (retentionCheck.retain && !reason.includes('GDPR_REQUEST')) {
        await this.auditLogger.logDataDeletion({
          ...contextWithHub,
          deletionType: 'student_data',
          resourceIds: [studentId],
          hubId: student.hubId,
          success: false,
          errorMessage: `Data retention policy prevents deletion: ${retentionCheck.reason}`,
          reason,
        });
        throw new BadRequestException(`Cannot delete: ${retentionCheck.reason}`);
      }

      // Perform deletion
      await this.studentRepository.remove(student);

      // Log successful deletion
      await this.auditLogger.logDataDeletion({
        ...contextWithHub,
        deletionType: 'student_data',
        resourceIds: [studentId],
        hubId: student.hubId,
        success: true,
        reason,
      });

      return {
        deleted: true,
        message: 'Student data permanently deleted in compliance with GDPR Article 17 (Right to erasure)',
      };
    } catch (error) {
      // Log failed deletion attempt
      await this.auditLogger.logDataDeletion({
        ...context,
        deletionType: 'student_data',
        resourceIds: [studentId],
        hubId: 'unknown',
        success: false,
        errorMessage: error.message,
        reason,
      });
      throw error;
    }
  }
}