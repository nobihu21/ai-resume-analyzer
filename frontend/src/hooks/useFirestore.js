import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export const useFirestore = (collectionName, conditions = null) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let q;

        if (conditions) {
          // Build query with conditions
          const constraints = [];
          conditions.forEach(condition => {
            constraints.push(where(condition.field, condition.operator, condition.value));
          });
          q = query(collection(db, collectionName), ...constraints, orderBy('createdAt', 'desc'));
        } else {
          q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
        }

        const snapshot = await getDocs(q);
        const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(documents);
        setError(null);
      } catch (err) {
        console.error('Firestore fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (collectionName) {
      fetchData();
    }
  }, [collectionName, conditions]);

  return { data, loading, error };
};

export const useFirestoreDocument = (collectionName, docId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setData({ id: docSnap.id, ...docSnap.data() });
        } else {
          setData(null);
        }
        setError(null);
      } catch (err) {
        console.error('Firestore document fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (collectionName && docId) {
      fetchDocument();
    }
  }, [collectionName, docId]);

  return { data, loading, error };
};

export const useFirestoreMutations = () => {
  const addDocument = async (collectionName, data) => {
    try {
      const docRef = await setDoc(
        doc(collection(db, collectionName)),
        {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      );
      return docRef;
    } catch (err) {
      console.error('Add document error:', err);
      throw err;
    }
  };

  const updateDocument = async (collectionName, docId, data) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Update document error:', err);
      throw err;
    }
  };

  const deleteDocument = async (collectionName, docId) => {
    try {
      await deleteDoc(doc(db, collectionName, docId));
    } catch (err) {
      console.error('Delete document error:', err);
      throw err;
    }
  };

  return { addDocument, updateDocument, deleteDocument };
};
