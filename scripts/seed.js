import { initializeApp } from 'firebase/app';
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore'; // Import 'doc'
import { firebaseConfig } from '../src/firebase/config.js';

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Sample Data
const forklifts = [
    { serialNumber: 'F12345', make: 'Toyota', model: '8FGCU25', year: 2021, capacity: '5000 lbs', equipmentType: 'Counterbalance' },
    { serialNumber: 'H67890', make: 'Hyster', model: 'H50FT', year: 2020, capacity: '5000 lbs', equipmentType: 'Counterbalance' },
    { serialNumber: 'C13579', make: 'Clark', model: 'C25', year: 2022, capacity: '5000 lbs', equipmentType: 'Reach Truck' },
    { serialNumber: 'Y24680', make: 'Yale', model: 'GLC050VX', year: 2019, capacity: '5000 lbs', equipmentType: 'Pallet Jack' },
];

const employees = [
    { firstName: 'John', lastName: 'Doe', specialization: 'Electrical Technician', availability: true },
    { firstName: 'Jane', lastName: 'Smith', specialization: 'Mechanical Technician', availability: false },
    { firstName: 'Mike', lastName: 'Johnson', specialization: 'Hydraulics Technician', availability: true },
    { firstName: 'Sam', lastName: 'Wilson', specialization: 'General Worker', availability: true },
];

const seedCollection = async (collectionName, data) => {
    try {
        const batch = writeBatch(db);
        const collectionRef = collection(db, collectionName);
        console.log(`Seeding ${collectionName}...`);
        
        data.forEach((item) => {
            const docRef = doc(collectionRef); // Use doc(collectionRef) to get a new document reference
            batch.set(docRef, item);
        });
        
        await batch.commit();
        console.log(`${collectionName} collection seeded successfully!`);
    } catch (e) {
        console.error(`Error seeding ${collectionName}:`, e);
    }
}

const seedDatabase = async () => {
    console.log('Starting database seed...');
    await seedCollection('forklifts', forklifts);
    await seedCollection('employees', employees);
    console.log('Database seeding finished.');
    // The script will hang, so we need to exit explicitly.
    process.exit(0);
};

seedDatabase();
