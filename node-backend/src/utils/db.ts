// AI_Avatar/node-backend/src/utils/db.ts
import { Pool, QueryResult } from 'pg';
import logger from './logger';
import config from '../config';
import { Contact, ContactInput, DbConfig } from '../types';
import { PoolClient } from 'pg';

class Database {
  private pool: Pool;

  constructor() {
    const dbConfig: DbConfig = {
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      ssl: config.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

    this.pool = new Pool(dbConfig);

    this.pool.on('error', (err: Error) => {
      logger.error('Unexpected error on idle PostgreSQL client', err);
    });

    this.init().catch(err => {
      logger.error('Error initializing database', err);
    });
  }

  async init(): Promise<void> {
    logger.info('Initializing database connection and tables...');
    
    try {
      // Check connection
      const client = await this.pool.connect();
      logger.info('Successfully connected to PostgreSQL database');

      try {
        // Create contacts table if it doesn't exist
        await client.query(`
          CREATE TABLE IF NOT EXISTS contacts (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            company VARCHAR(100),
            email VARCHAR(100) NOT NULL,
            phone VARCHAR(50),
            note TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        logger.info('Contacts table created or already exists');
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Database initialization error', error);
      throw error;
    }
  }

  /**
   * Save a new contact form submission
   * @param contactData - The contact form data
   * @returns The saved contact with ID
   */
  async saveContact(contactData: ContactInput): Promise<Contact> {
    logger.info('Saving contact to database', { name: contactData.name, email: contactData.email });
    
    const query = `
      INSERT INTO contacts (name, company, email, phone, note)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    
    const values = [
      contactData.name,
      contactData.company || '',
      contactData.email,
      contactData.phone || '',
      contactData.note || ''
    ];
    
    try {
      const result: QueryResult<Contact> = await this.pool.query(query, values);
      logger.info(`Contact saved successfully with ID: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving contact to database', error);
      throw error;
    }
  }

  /**
   * Get all contacts
   * @returns Array of contact records
   */
  async getContacts(): Promise<Contact[]> {
    try {
      const result: QueryResult<Contact> = await this.pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      logger.error('Error retrieving contacts from database', error);
      throw error;
    }
  }

  /**
   * Get a single contact by ID
   * @param id - The contact ID
   * @returns The contact record
   */
  async getContactById(id: string): Promise<Contact | null> {
    try {
      const result: QueryResult<Contact> = await this.pool.query('SELECT * FROM contacts WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error retrieving contact ID:${id} from database`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new Database();