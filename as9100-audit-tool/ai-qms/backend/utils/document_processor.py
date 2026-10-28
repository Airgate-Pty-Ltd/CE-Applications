import os
from typing import List, Dict, Any
import openai
from dotenv import load_dotenv
import json

load_dotenv()

class DocumentProcessor:
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.max_tokens = 4096  # Adjust based on model limits

    async def process_document(self, file_path: str, clauses: List[str], context: str = None) -> Dict[str, Any]:
        """
        Process a document and analyze it against AS9100 clauses.
        
        Args:
            file_path: Path to the document file
            clauses: List of AS9100 clauses to check
            context: Additional context for the analysis
            
        Returns:
            Dictionary containing analysis results
        """
        try:
            # Read and prepare document content
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()

            # Prepare the prompt for OpenAI
            prompt = self._prepare_prompt(content, clauses, context)
            
            # Call OpenAI API
            response = await self._analyze_with_openai(prompt)
            
            # Process and structure the response
            return self._process_response(response, clauses)
            
        except Exception as e:
            raise Exception(f"Error processing document: {str(e)}")

    def _prepare_prompt(self, content: str, clauses: List[str], context: str = None) -> str:
        """Prepare the prompt for OpenAI analysis."""
        prompt = f"""
        Analyze the following document against the specified AS9100 clauses.
        Provide a detailed compliance assessment and recommendations for any non-conformities.

        Document Content:
        {content[:self.max_tokens]}

        AS9100 Clauses to Review:
        {', '.join(clauses)}

        Additional Context:
        {context if context else 'None provided'}
        """
        return prompt

    async def _analyze_with_openai(self, prompt: str) -> str:
        """Call OpenAI API for document analysis."""
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",  # or appropriate model
                messages=[
                    {"role": "system", "content": "You are an expert in AS9100 standards and quality management systems."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

    def _process_response(self, response: str, clauses: List[str]) -> Dict[str, Any]:
        """Process and structure the OpenAI response."""
        try:
            # Parse the response into structured data
            # This is a simplified example - you might want to use more sophisticated parsing
            findings = []
            recommendations = []
            
            # Split response into sections
            sections = response.split('\n\n')
            
            for section in sections:
                if 'finding' in section.lower():
                    findings.append(section)
                elif 'recommendation' in section.lower():
                    recommendations.append(section)
            
            return {
                "compliance_status": "non_compliant" if findings else "compliant",
                "findings": findings,
                "recommendations": recommendations,
                "clauses_checked": clauses
            }
        except Exception as e:
            raise Exception(f"Error processing response: {str(e)}")

    async def generate_corrections(self, findings: List[str], original_content: str) -> str:
        """
        Generate corrected document content based on findings.
        
        Args:
            findings: List of non-conformities
            original_content: Original document content
            
        Returns:
            Corrected document content
        """
        try:
            prompt = f"""
            Based on the following findings, generate corrected content for the document.
            Maintain the original format and structure while addressing the non-conformities.

            Findings:
            {json.dumps(findings, indent=2)}

            Original Content:
            {original_content[:self.max_tokens]}
            """
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert in AS9100 standards and quality management systems."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"Error generating corrections: {str(e)}") 